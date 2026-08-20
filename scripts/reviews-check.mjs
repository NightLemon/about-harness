import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const legacyDir = path.join(root, 'docs', 'reviews', 'legacy')
const v1Dir = path.join(root, 'docs', 'reviews', 'v1')
const errors = []

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

for (const [name, expected] of Object.entries(expectedLegacy)) {
  const file = path.join(legacyDir, name)
  if (!fs.existsSync(file)) {
    errors.push(`missing legacy review: ${name}`)
    continue
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase()
  if (actual !== expected) errors.push(`${name}: legacy hash changed (${actual})`)
}

for (let round = 1; round <= 10; round += 1) {
  const id = String(round).padStart(2, '0')
  const stub = path.join(root, 'docs', 'reviews', `round-${id}.md`)
  if (!fs.existsSync(stub)) errors.push(`missing old-route stub: round-${id}.md`)
}

const v1Rounds = fs.readdirSync(v1Dir).filter((name) => /^round-\d{2}\.md$/.test(name))
for (const name of v1Rounds) {
  const id = name.match(/\d{2}/)[0]
  const artifactDir = path.join(root, 'artifacts', 'reviews', 'v1', `round-${id}`)
  for (const required of ['baseline.json', 'findings.md', 'diff.patch', 'verification.json', 'unresolved.md']) {
    if (!fs.existsSync(path.join(artifactDir, required))) errors.push(`${name}: missing artifact ${required}`)
  }
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

console.log(`Review check passed: 10 legacy hashes preserved; ${v1Rounds.length} v1 round record(s) present.`)
