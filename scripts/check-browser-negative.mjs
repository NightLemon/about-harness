import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
const result=spawnSync(process.execPath,['scripts/browser-lab.mjs','--inject-failure'],{encoding:'utf8',timeout:30000})
assert.notEqual(result.status,0)
assert.match(result.stderr,/browser artifact verification failed/)
console.log('Browser negative check passed: incorrect extracted artifact rejected; browser and server closed.')
