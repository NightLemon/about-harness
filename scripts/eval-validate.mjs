import { assertArtifactLineage, assertExecutionTasks, assertFixtureLineage, assertRuns, assertStudy, readJson, readJsonl } from './eval-lib.mjs'
import path from 'node:path'

const [taskFile, fixtureRefFile, studyFile, runFile] = process.argv.slice(2)
if (!taskFile || !fixtureRefFile || !studyFile || !runFile) {
  console.error('Usage: node scripts/eval-validate.mjs <tasks.jsonl> <fixture-refs.json> <study.json> <runs.jsonl>')
  process.exit(2)
}

try {
  const tasks = readJsonl(taskFile)
  const fixtureRefs = readJson(fixtureRefFile)
  const study = readJson(studyFile)
  const rows = readJsonl(runFile)
  const design = assertStudy(study)
  const coverage = assertRuns(rows, study)
  const lineage = study.schema_version === '1.2'
    ? (assertArtifactLineage(rows, path.dirname(runFile)), assertExecutionTasks(tasks, fixtureRefs, rows, study, path.dirname(runFile)))
    : assertFixtureLineage(tasks, fixtureRefs, rows, design.taskIds)
  const expectedRows = study.tasks.length * study.configs.length * study.repeats
  console.log(JSON.stringify({
    schema_version: '1.0',
    study_schema_version: study.schema_version,
    study_id: study.study_id,
    tasks: study.tasks.length,
    workloads: design.workloads.size,
    holdout: design.holdout,
    configs: study.configs.length,
    repeats: study.repeats,
    pass_rate_analysis_unit: design.analysisUnit,
    task_pass_min_runs: design.taskPassMinRuns,
    sample_rows: rows.length,
    fixture_refs: lineage.refs.size,
    formal_matrix_rows: expectedRows,
    unique_matrix_cells: coverage.cells.size,
    missing_matrix_cells: coverage.missingCells.length,
    sample_matrix_complete: coverage.missingCells.length === 0,
    evidence_boundary: 'Run rows are an E1 schema/analysis sample, not E2/E3 model evidence.'
  }, null, 2))
} catch (error) {
  console.error(`Evaluation validation failed: ${error.message}`)
  process.exit(1)
}
