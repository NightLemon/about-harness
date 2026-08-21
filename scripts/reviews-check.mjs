import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const legacyDir = path.join(root, 'docs', 'reviews', 'legacy')
const v1Dir = path.join(root, 'docs', 'reviews', 'v1')
const errors = []
const allowPending = process.env.REVIEWS_ALLOW_PENDING || ''

const expectedLegacy = {
  'round-01.md': '530C9476C2D220F39166D6D4D126A2ADF3F9F50EB5A8208A0E43E90F9301C931',
  'round-02.md': '3A7412EA229E6672C323E76A472C2BF6AD39DF5F317352DB694DE57ED6CC58A6',
  'round-03.md': '9233E803C058BEF26553202F0F2F611C95B4CC3C0D03B1CD0B4FEF58CAD4861C',
  'round-04.md': '73F42BF8A0115910F9385CB1C20DE94B10689ECB4C807E3193CE035F73361E63',
  'round-05.md': '13EA97539CFD9E2AC6454DD2F220E431294726F01903DED748ECCE5583F317A5',
  'round-06.md': 'F6FEA1987C9640968A782DABC7388E3CB40C5763D4FD7551D5C69E3D445E42C8',
  'round-07.md': '64D970EBAD9DFD127A8CA720954B9C6448D354CFB79B0D562CCC0F266D48E68C',
  'round-08.md': '28C1CC67735EF44B77B954ADCC80767234AAAA9AA5307BF80696DE5CB1FA8E0F',
  'round-09.md': '515CD35382B6150FBA606ECBA165466E43768021B1D6D7DD1B7A9EFB9C8A9041',
  'round-10.md': '8CA608D92DE0CF363090C3B29A999CD417D44AD56B9275A34F9333B6995E72BB'
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase()
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`)
    return null
  }
}

function git(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' })
}

const gitProbe = git(['rev-parse', '--is-inside-work-tree'])
const hasGit = gitProbe.status === 0 && gitProbe.stdout.trim() === 'true'

function commitFromAnnotatedTag(tag, label, allowMissing = false) {
  const type = git(['cat-file', '-t', `refs/tags/${tag}`])
  if (type.status !== 0) {
    if (!allowMissing) errors.push(`${label}: missing annotated tag ${tag}`)
    return null
  }
  if (type.stdout.trim() !== 'tag') {
    errors.push(`${label}: ${tag} is not an annotated tag`)
    return null
  }
  const commit = git(['rev-parse', `${tag}^{commit}`])
  if (commit.status !== 0) {
    errors.push(`${label}: cannot resolve ${tag} to a commit`)
    return null
  }
  return commit.stdout.trim()
}

function requireAncestor(older, newer, label) {
  const result = git(['merge-base', '--is-ancestor', older, newer])
  if (result.status !== 0) errors.push(`${label}: ${older.slice(0, 7)} is not an ancestor of ${newer.slice(0, 7)}`)
}

function resolveCommit(value, label) {
  if (!/^[0-9a-f]{7,40}$/i.test(value || '')) {
    errors.push(`${label}: invalid commit reference`)
    return null
  }
  if (!hasGit) {
    if (value.length !== 40) errors.push(`${label}: abbreviated commit cannot be verified outside a Git worktree`)
    return value.toLowerCase()
  }
  const result = git(['rev-parse', '--verify', `${value}^{commit}`])
  if (result.status !== 0) {
    errors.push(`${label}: commit reference does not resolve`)
    return null
  }
  return result.stdout.trim().toLowerCase()
}

function patchBody(raw) {
  const normalized = raw.replace(/\r\n/g, '\n')
  const match = /(^|\n)diff --git /.exec(normalized)
  if (!match) return ''
  return normalized
    .slice(match.index + (match[1] ? 1 : 0))
    .replace(/^(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@).*$/gm, '$1')
    .trimEnd()
}

function patchPaths(body, label) {
  const paths = []
  for (const match of body.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)) {
    const left = match[1]
    const right = match[2]
    for (const candidate of [left, right]) {
      if (candidate.startsWith('/') || candidate.split('/').includes('..')) {
        errors.push(`${label}: diff.patch contains unsafe path ${candidate}`)
      }
    }
    paths.push(right)
  }
  return [...new Set(paths)]
}

for (const [name, expected] of Object.entries(expectedLegacy)) {
  const file = path.join(legacyDir, name)
  if (!fs.existsSync(file)) {
    errors.push(`missing legacy review: ${name}`)
    continue
  }
  const actual = sha256(file)
  if (actual !== expected) errors.push(`${name}: legacy hash changed (${actual})`)
}

for (let round = 1; round <= 10; round += 1) {
  const id = String(round).padStart(2, '0')
  const stub = path.join(root, 'docs', 'reviews', `round-${id}.md`)
  if (!fs.existsSync(stub)) errors.push(`missing old-route stub: round-${id}.md`)
}

const v1Rounds = fs.existsSync(v1Dir)
  ? fs.readdirSync(v1Dir).filter((name) => /^round-\d{2}\.md$/.test(name)).sort()
  : []

for (let index = 0; index < v1Rounds.length; index += 1) {
  const expected = `round-${String(index + 1).padStart(2, '0')}.md`
  if (v1Rounds[index] !== expected || index >= 10) errors.push(`v1 reviews must be contiguous round-01 through round-10; found ${v1Rounds[index]}`)
}

let previousEvidenceCommit = null
for (const name of v1Rounds) {
  const id = name.match(/\d{2}/)[0]
  const label = `round-${id}`
  const artifactDir = path.join(root, 'artifacts', 'reviews', 'v1', label)
  const docPath = path.join(v1Dir, name)
  const required = ['baseline.json', 'findings.md', 'diff.patch', 'verification.json', 'unresolved.md']
  for (const requiredName of required) {
    const file = path.join(artifactDir, requiredName)
    if (!fs.existsSync(file)) errors.push(`${name}: missing artifact ${requiredName}`)
    else if (fs.statSync(file).size === 0) errors.push(`${name}: empty artifact ${requiredName}`)
  }
  if (!required.every((requiredName) => fs.existsSync(path.join(artifactDir, requiredName)))) continue

  const baseline = readJson(path.join(artifactDir, 'baseline.json'), `${label} baseline`)
  const verification = readJson(path.join(artifactDir, 'verification.json'), `${label} verification`)
  if (!baseline || !verification) continue
  if (String(baseline.round).padStart(2, '0') !== id) errors.push(`${label}: baseline round mismatch`)
  if (String(verification.round).padStart(2, '0') !== id) errors.push(`${label}: verification round mismatch`)
  const baselineMetadataCommit = resolveCommit(baseline.baseline_commit, `${label} baseline metadata`)
  const baselineCommit = resolveCommit(verification.baseline_commit, `${label} verification baseline_commit`)
  const findingsCommit = resolveCommit(verification.findings_commit, `${label} findings_commit`)
  const contentResultCommit = resolveCommit(verification.content_result_commit, `${label} content_result_commit`)
  if (baselineMetadataCommit && baselineCommit && baselineMetadataCommit !== baselineCommit) errors.push(`${label}: baseline commit differs between metadata files`)
  if (previousEvidenceCommit && baselineCommit && previousEvidenceCommit !== baselineCommit) {
    errors.push(`${label}: baseline is not the previous round evidence commit`)
  }
  if (!baseline.baseline_tag || !verification.complete_tag) errors.push(`${label}: missing baseline/complete tag metadata`)
  if (!Array.isArray(verification.commands) || !verification.commands.length || verification.commands.some((item) => item.exit_code !== 0)) {
    errors.push(`${label}: verification commands are missing or contain failures`)
  }
  if (verification.result?.open_blockers !== 0) errors.push(`${label}: open blockers are not zero`)

  const findings = fs.readFileSync(path.join(artifactDir, 'findings.md'), 'utf8')
  if (!new RegExp(`R${id}-P[0-3]-\\d{2}`).test(findings)) errors.push(`${label}: findings contain no round-specific P0-P3 ID`)
  const diff = fs.readFileSync(path.join(artifactDir, 'diff.patch'), 'utf8')
  const normalizedPatch = patchBody(diff)
  const changedPaths = patchPaths(normalizedPatch, label)
  if (!normalizedPatch || changedPaths.length === 0) errors.push(`${label}: diff.patch is not a non-empty Git patch`)
  const unresolved = fs.readFileSync(path.join(artifactDir, 'unresolved.md'), 'utf8')
  for (const severity of ['P0', 'P1', 'P2', 'P3']) {
    if (!unresolved.includes(`开放 ${severity}`)) errors.push(`${label}: unresolved.md lacks ${severity} count`)
  }

  const hashes = verification.artifact_hashes
  if (!hashes || typeof hashes !== 'object') errors.push(`${label}: missing artifact_hashes`)
  else {
    for (const artifact of ['baseline.json', 'findings.md', 'diff.patch', 'unresolved.md', `docs/reviews/v1/${name}`]) {
      if (!hashes[artifact]) errors.push(`${label}: artifact_hashes does not cover ${artifact}`)
    }
    for (const [artifact, expected] of Object.entries(hashes)) {
      const file = artifact.includes('/') ? path.join(root, artifact) : path.join(artifactDir, artifact)
      if (!/^[0-9a-f]{64}$/i.test(expected || '')) errors.push(`${label}: invalid SHA256 for ${artifact}`)
      else if (!fs.existsSync(file)) errors.push(`${label}: hashed artifact is missing: ${artifact}`)
      else if (sha256(file) !== expected) errors.push(`${label}: artifact hash mismatch: ${artifact}`)
    }
  }

  if (!hasGit) continue
  const baselineTagCommit = commitFromAnnotatedTag(baseline.baseline_tag, label)
  if (baselineTagCommit && baselineCommit && baselineTagCommit !== baselineCommit) errors.push(`${label}: baseline tag points to the wrong commit`)
  const pending = allowPending === id
  const evidenceCommit = commitFromAnnotatedTag(verification.complete_tag, label, pending)
  if (evidenceCommit) {
    if (baselineCommit && findingsCommit) requireAncestor(baselineCommit, findingsCommit, label)
    if (findingsCommit && contentResultCommit) requireAncestor(findingsCommit, contentResultCommit, label)
    if (contentResultCommit) requireAncestor(contentResultCommit, evidenceCommit, label)
    for (const rel of [
      `docs/reviews/v1/${name}`,
      ...required.map((requiredName) => `artifacts/reviews/v1/${label}/${requiredName}`)
    ]) {
      if (git(['cat-file', '-e', `${evidenceCommit}:${rel}`]).status !== 0) errors.push(`${label}: complete tag does not contain ${rel}`)
    }
  }

  if (normalizedPatch && changedPaths.length && contentResultCommit) {
    const candidates = [baselineCommit, findingsCommit].filter(Boolean)
    const matches = candidates.some((fromCommit) => {
      const generated = git(['diff', '--unified=0', '--no-color', '--no-ext-diff', fromCommit, contentResultCommit, '--', ...changedPaths])
      return generated.status === 0 && patchBody(generated.stdout) === normalizedPatch
    })
    if (!matches) errors.push(`${label}: diff.patch does not match its paths from baseline/findings to content result`)
  }
  if (evidenceCommit) previousEvidenceCommit = evidenceCommit
}

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
if (/完整版本已完成\s*10\s*轮/.test(readme)) errors.push('README still claims legacy ten rounds are complete')
const changelog = fs.readFileSync(path.join(root, 'docs', 'meta', 'changelog.md'), 'utf8')
if (!changelog.includes('不计入 v1')) errors.push('changelog must state that legacy rounds do not count toward v1')

if (errors.length) {
  console.error(`Review check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Review check passed: 10 legacy hashes preserved; ${v1Rounds.length} v1 round record(s) have structured evidence${hasGit ? ', lineage and annotated tags' : ''}.`)
