import { assertRuns, assertStudy, percentile, readJson, readJsonl, wilson95 } from './eval-lib.mjs'

const [studyFile, runFile] = process.argv.slice(2)
if (!studyFile || !runFile) {
  console.error('Usage: node scripts/summarize-evals.mjs <study.json> <runs.jsonl>')
  process.exit(2)
}

const study = readJson(studyFile)
const rows = readJsonl(runFile)
const design = assertStudy(study)
const coverage = assertRuns(rows, study)

function summarizeRuns(runs) {
  if (runs.length === 0) return null
  const passed = runs.filter((row) => row.passed).length
  return {
    runs: runs.length,
    distinct_tasks: new Set(runs.map((row) => row.task_id)).size,
    passed,
    pass_rate: Number((passed / runs.length).toFixed(4)),
    pass_rate_wilson95: wilson95(passed, runs.length),
    safety_violations: runs.filter((row) => row.safety_violation).length,
    duration_ms_p50: percentile(runs.map((row) => row.duration_ms), 0.5),
    duration_ms_p90: percentile(runs.map((row) => row.duration_ms), 0.9),
    cost_usd_p90: percentile(runs.map((row) => row.cost_usd), 0.9),
    cost_usd_total: Number(runs.reduce((sum, row) => sum + row.cost_usd, 0).toFixed(6)),
    input_tokens_total: runs.reduce((sum, row) => sum + row.input_tokens, 0),
    output_tokens_total: runs.reduce((sum, row) => sum + row.output_tokens, 0),
    tool_errors_total: runs.reduce((sum, row) => sum + row.tool_errors, 0),
    human_turns_total: runs.reduce((sum, row) => sum + row.human_turns, 0),
    failure_types: Object.fromEntries(
      Object.entries(Object.groupBy(
        runs.filter((row) => !row.passed),
        (row) => row.failure_type || 'unclassified'
      )).map(([key, values]) => [key, values.length])
    )
  }
}

function summarizeTasks(runs) {
  if (runs.length === 0 || design.analysisUnit !== 'task') return null
  const outcomes = [...Map.groupBy(runs, (row) => row.task_id)].map(([taskId, taskRuns]) => {
    const successfulRuns = taskRuns.filter((row) => row.passed).length
    const evaluable = taskRuns.length === study.repeats
    return {
      task_id: taskId,
      runs: taskRuns.length,
      successful_runs: successfulRuns,
      evaluable,
      passed: evaluable ? successfulRuns >= design.taskPassMinRuns : null
    }
  })
  const evaluable = outcomes.filter((outcome) => outcome.evaluable)
  const passedTasks = evaluable.filter((outcome) => outcome.passed).length
  return {
    tasks_observed: outcomes.length,
    evaluable_tasks: evaluable.length,
    incomplete_tasks: outcomes.length - evaluable.length,
    passed_tasks: passedTasks,
    pass_rate: evaluable.length > 0 ? rounded(passedTasks / evaluable.length, 4) : null,
    pass_rate_wilson95: evaluable.length > 0 ? wilson95(passedTasks, evaluable.length) : null
  }
}

function completeTaskOutcomes(runs) {
  const outcomes = new Map()
  for (const [taskId, taskRuns] of Map.groupBy(runs, (row) => row.task_id)) {
    if (taskRuns.length !== study.repeats) continue
    outcomes.set(
      taskId,
      taskRuns.filter((row) => row.passed).length >= design.taskPassMinRuns
    )
  }
  return outcomes
}

function weightedQuantile(distribution, quantile) {
  let cumulative = 0
  let largestValue = null
  for (const [value, probability] of [...distribution].sort(([left], [right]) => left - right)) {
    largestValue = value
    cumulative += probability
    if (cumulative + 1e-12 >= quantile) return value
  }
  return largestValue
}

function exactBootstrapMeanInterval(values, confidenceLevel = 0.95) {
  if (values.length === 0) return null
  const valueProbabilities = new Map()
  for (const value of values) {
    valueProbabilities.set(value, (valueProbabilities.get(value) ?? 0) + (1 / values.length))
  }

  let sumDistribution = new Map([[0, 1]])
  for (let draw = 0; draw < values.length; draw += 1) {
    const next = new Map()
    for (const [sum, sumProbability] of sumDistribution) {
      for (const [value, valueProbability] of valueProbabilities) {
        const nextSum = sum + value
        next.set(nextSum, (next.get(nextSum) ?? 0) + (sumProbability * valueProbability))
      }
    }
    sumDistribution = next
  }

  const alpha = (1 - confidenceLevel) / 2
  return {
    lower: rounded(weightedQuantile(sumDistribution, alpha) / values.length, 4),
    upper: rounded(weightedQuantile(sumDistribution, 1 - alpha) / values.length, 4)
  }
}

function pairedTaskEffect(baselineRuns, candidateRuns) {
  const baselineOutcomes = completeTaskOutcomes(baselineRuns)
  const candidateOutcomes = completeTaskOutcomes(candidateRuns)
  const taskIds = [...baselineOutcomes.keys()]
    .filter((taskId) => candidateOutcomes.has(taskId))
    .sort()
  if (taskIds.length === 0) return null

  const pairs = taskIds.map((taskId) => ({
    baseline: baselineOutcomes.get(taskId),
    candidate: candidateOutcomes.get(taskId)
  }))
  const baselinePassed = pairs.filter((pair) => pair.baseline).length
  const candidatePassed = pairs.filter((pair) => pair.candidate).length
  const differences = pairs.map((pair) => Number(pair.candidate) - Number(pair.baseline))
  return {
    paired_tasks: pairs.length,
    baseline_passed_tasks: baselinePassed,
    candidate_passed_tasks: candidatePassed,
    both_passed: pairs.filter((pair) => pair.baseline && pair.candidate).length,
    both_failed: pairs.filter((pair) => !pair.baseline && !pair.candidate).length,
    candidate_only_passed: pairs.filter((pair) => !pair.baseline && pair.candidate).length,
    baseline_only_passed: pairs.filter((pair) => pair.baseline && !pair.candidate).length,
    bootstrap: {
      method: 'nonparametric_percentile',
      computation: 'exact_empirical_distribution',
      confidence_level: 0.95,
      pass_rate_delta_interval: exactBootstrapMeanInterval(differences)
    }
  }
}

const grouped = Map.groupBy(rows, (row) => row.config_id)
const configs = {}
for (const [config, runs] of grouped) {
  configs[config] = {
    ...summarizeRuns(runs),
    by_split: {
      development: summarizeRuns(runs.filter((row) => row.split === 'development')),
      holdout: summarizeRuns(runs.filter((row) => row.split === 'holdout'))
    },
    task_level: design.analysisUnit === 'task'
      ? {
          successful_runs_required: design.taskPassMinRuns,
          scheduled_runs_per_task: study.repeats,
          by_split: {
            development: summarizeTasks(runs.filter((row) => row.split === 'development')),
            holdout: summarizeTasks(runs.filter((row) => row.split === 'holdout'))
          }
        }
      : null
  }
}

const pairwise = []
const baseline = study.configs[0]
for (const split of ['development', 'holdout']) {
  const splitRows = rows.filter((row) => row.split === split)
  const pairKeys = new Set(splitRows.map((row) => `${row.task_id}#${row.repeat}`))
  for (const candidate of study.configs.slice(1)) {
    let wins = 0
    let losses = 0
    let ties = 0
    for (const key of pairKeys) {
      const [taskId, repeatText] = key.split('#')
      const repeat = Number(repeatText)
      const a = splitRows.find((row) => row.task_id === taskId && row.repeat === repeat && row.config_id === baseline)
      const b = splitRows.find((row) => row.task_id === taskId && row.repeat === repeat && row.config_id === candidate)
      if (!a || !b) continue
      if (b.passed && !a.passed) wins += 1
      else if (!b.passed && a.passed) losses += 1
      else ties += 1
    }
    pairwise.push({ split, baseline, candidate, wins, losses, ties, complete_pairs: wins + losses + ties })
  }
}

const evidenceMatchesTarget = rows.every((row) => row.evidence === study.evidence_target)
const noSafetyViolations = rows.every((row) => row.safety_violation === false)
const matrixComplete = coverage.missingCells.length === 0
const evidenceLevels = [...new Set(rows.map((row) => row.evidence))].sort()
const evidence = evidenceLevels.length === 1 ? evidenceLevels[0] : 'mixed'
const structuralBlockers = [
  ...(!matrixComplete ? ['incomplete_matrix'] : []),
  ...(!evidenceMatchesTarget ? ['evidence_below_target'] : []),
  ...(!noSafetyViolations ? ['safety_violation'] : [])
]

function rounded(value, digits) {
  return Number(value.toFixed(digits))
}

const promotionCandidates = {}
const baselineHoldout = configs[baseline]?.by_split.holdout ?? null
const baselineHoldoutRows = (grouped.get(baseline) ?? []).filter((row) => row.split === 'holdout')
const baselinePassSummary = design.analysisUnit === 'task'
  ? configs[baseline]?.task_level?.by_split.holdout ?? null
  : baselineHoldout
for (const candidate of study.configs.slice(1)) {
  const candidateHoldout = configs[candidate]?.by_split.holdout ?? null
  const candidateHoldoutRows = (grouped.get(candidate) ?? []).filter((row) => row.split === 'holdout')
  const candidatePassSummary = design.analysisUnit === 'task'
    ? configs[candidate]?.task_level?.by_split.holdout ?? null
    : candidateHoldout
  const taskEffect = design.analysisUnit === 'task'
    ? pairedTaskEffect(baselineHoldoutRows, candidateHoldoutRows)
    : null
  const metricsAvailable = baselineHoldout !== null
    && candidateHoldout !== null
    && baselinePassSummary !== null
    && candidatePassSummary !== null
    && (design.analysisUnit === 'task'
      ? taskEffect !== null
      : baselinePassSummary.pass_rate !== null && candidatePassSummary.pass_rate !== null)
  const baselinePassRate = metricsAvailable
    ? design.analysisUnit === 'task'
      ? taskEffect.baseline_passed_tasks / taskEffect.paired_tasks
      : baselinePassSummary.passed / baselinePassSummary.runs
    : null
  const candidatePassRate = metricsAvailable
    ? design.analysisUnit === 'task'
      ? taskEffect.candidate_passed_tasks / taskEffect.paired_tasks
      : candidatePassSummary.passed / candidatePassSummary.runs
    : null
  const passRateDelta = metricsAvailable ? candidatePassRate - baselinePassRate : null
  const p90CostDelta = metricsAvailable ? candidateHoldout.cost_usd_p90 - baselineHoldout.cost_usd_p90 : null
  const observed = metricsAvailable
    ? {
        baseline_pass_rate: rounded(baselinePassRate, 4),
        candidate_pass_rate: rounded(candidatePassRate, 4),
        pass_rate_delta: rounded(passRateDelta, 4),
        ...(design.analysisUnit === 'task'
          ? {
              baseline_tasks: taskEffect.paired_tasks,
              candidate_tasks: taskEffect.paired_tasks,
              baseline_passed_tasks: taskEffect.baseline_passed_tasks,
              candidate_passed_tasks: taskEffect.candidate_passed_tasks,
              paired_task_effect: taskEffect
            }
          : {
              baseline_runs: baselinePassSummary.runs,
              candidate_runs: candidatePassSummary.runs
            }),
        baseline_p90_cost_usd: baselineHoldout.cost_usd_p90,
        candidate_p90_cost_usd: candidateHoldout.cost_usd_p90,
        p90_cost_usd_delta: rounded(p90CostDelta, 6)
      }
    : {
        baseline_pass_rate: null,
        candidate_pass_rate: null,
        pass_rate_delta: null,
        ...(design.analysisUnit === 'task'
          ? {
              baseline_tasks: null,
              candidate_tasks: null,
              baseline_passed_tasks: null,
              candidate_passed_tasks: null,
              paired_task_effect: null
            }
          : {
              baseline_runs: null,
              candidate_runs: null
            }),
        baseline_p90_cost_usd: null,
        candidate_p90_cost_usd: null,
        p90_cost_usd_delta: null
      }
  const thresholdBlockers = []
  if (structuralBlockers.length === 0 && !metricsAvailable) {
    thresholdBlockers.push('holdout_metrics_unavailable')
  }
  if (structuralBlockers.length === 0 && metricsAvailable) {
    if (passRateDelta < study.promotion.min_pass_rate_delta) {
      thresholdBlockers.push('pass_rate_delta_below_minimum')
    }
    if (p90CostDelta > study.promotion.max_p90_cost_delta) {
      thresholdBlockers.push('p90_cost_delta_above_maximum')
    }
  }
  const blockers = [...structuralBlockers, ...thresholdBlockers]
  promotionCandidates[candidate] = {
    status: structuralBlockers.length > 0 || !metricsAvailable
      ? 'blocked'
      : thresholdBlockers.length > 0 ? 'failed' : 'passed',
    eligible: blockers.length === 0,
    observed,
    blockers
  }
}

const promotionEligible = Object.values(promotionCandidates).some((candidate) => candidate.eligible)
const eligibleCandidates = Object.entries(promotionCandidates)
  .filter(([, candidate]) => candidate.eligible)
  .map(([candidate]) => candidate)
const promotionBlockers = structuralBlockers.length > 0
  ? structuralBlockers
  : promotionEligible ? [] : ['no_candidate_met_promotion_thresholds']

console.log(JSON.stringify({
  schema_version: '1.0',
  study_schema_version: study.schema_version,
  evidence,
  evidence_levels: evidenceLevels,
  warning: evidence === 'E1'
    ? 'Synthetic/offline sample; do not use it as a model ranking.'
    : 'Eligibility is an analysis result, not an automatic deployment decision.',
  matrix: {
    expected_cells: coverage.expectedCells.length,
    observed_cells: coverage.cells.size,
    missing_cells: coverage.missingCells.length,
    complete: matrixComplete
  },
  promotion_eligible: promotionEligible,
  eligible_candidates: eligibleCandidates,
  promotion_blockers: promotionBlockers,
  promotion_analysis: {
    baseline,
    split: 'holdout',
    analysis_unit: design.analysisUnit,
    task_success_rule: design.analysisUnit === 'task'
      ? {
          successful_runs_required: design.taskPassMinRuns,
          scheduled_runs_per_task: study.repeats
        }
      : null,
    pass_rate_delta_unit: 'absolute_proportion',
    p90_cost_delta_unit: 'absolute_usd_per_run',
    thresholds: study.promotion,
    candidates: promotionCandidates
  },
  configs,
  pairwise
}, null, 2))
