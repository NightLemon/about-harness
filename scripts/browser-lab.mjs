import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import { chromium } from 'playwright'

const source = fs.readFileSync('lab/fixtures/sources-v2/catalog.html')
const manifest = JSON.parse(fs.readFileSync('lab/fixtures/sources-v2/manifest.json', 'utf8'))
const hash = crypto.createHash('sha256').update(source).digest('hex')
assert.equal(hash, manifest.files['catalog.html'])
const server = http.createServer((req, res) => {
  if (req.url !== '/catalog') { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(source)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const blocked = []
  await context.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== origin) { blocked.push('external'); await route.abort(); return }
    await route.continue()
  })
  const page = await context.newPage()
  const navigate = async url => {
    assert.equal(new URL(url).origin, origin, 'navigation outside task origin')
    await page.goto(url)
  }
  await navigate(`${origin}/catalog`)
  const observe = async () => ({ id: await page.locator('main').getAttribute('data-observation'),
    records: await page.locator('tbody tr').evaluateAll(rows => rows.map(row => ({
      sku: row.getAttribute('data-sku'), name: row.querySelector('[data-name]').textContent,
      element_id: row.id
    }))) })
  const first = await observe()
  const extract = async observation => {
    assert.equal(observation.id, await page.locator('main').getAttribute('data-observation'), 'stale observation')
    return observation.records
  }
  assert.equal((await extract(first)).length, 2)
  await page.getByRole('button', { name: '刷新本地观察' }).click()
  await assert.rejects(() => extract(first), /stale observation/)
  await assert.rejects(() => navigate('https://evil.invalid/'), /navigation outside task origin/)
  const current = await observe()
  assert.equal(current.id, 'catalog-2')
  assert.deepEqual(current.records, [{ sku: 'A-1', name: 'Alpha', element_id: 'row-a' },
                                    { sku: 'B-2', name: 'Beta', element_id: 'row-b' }])
  if (process.argv.includes('--inject-failure')) current.records[0].name = 'incorrect'
  assert.equal(current.records[0].name, 'Alpha', 'browser artifact verification failed')
  assert.deepEqual(blocked, [])
  console.log(JSON.stringify({ schema_version: '2.0', evidence: 'E1', offline: true,
    browser: await browser.version(), fixture_hash: hash, observation_id: current.id,
    records: current.records, actions: ['navigate-local', 'click-refresh', 'verify-observation'],
    negative_cases: ['stale-observation', 'external-navigation'], external_requests: blocked.length,
    passed: true, note: 'Actual local browser; no model or injection classifier.' }))
  await context.close()
} finally {
  if (browser) await browser.close()
  await new Promise(resolve => server.close(resolve))
}
