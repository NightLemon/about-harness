import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'about-harness-product-'))
try{
 const python=spawnSync('uv',['run','--frozen','--offline','python','-c','import sys; print(sys.executable)'],{encoding:'utf8'}).stdout.trim()
 const fixture=JSON.parse(fs.readFileSync('lab/fixtures/study-coding/tasks.json','utf8'))[0]
 for(const product of ['codex','pi','claude-code']){
  const output=path.join(temporary,product)
  const args=['scripts/product-workspace.py','--product',product,'--output',output]
  const run=spawnSync(python,args,{encoding:'utf8',timeout:20000})
  assert.equal(run.status,0,run.stderr)
  assert.equal(JSON.parse(run.stdout).baseline_exit_code,1)
  assert.equal(JSON.parse(run.stdout).product_executed,false)
  fs.writeFileSync(path.join(output,'solution.py'),fixture.candidate)
  const verified=spawnSync(python,['-I','-B','verify.py'],{cwd:output,encoding:'utf8'})
  assert.equal(verified.status,0,verified.stderr)
  const again=spawnSync(python,args,{encoding:'utf8'})
  assert.notEqual(again.status,0)
  assert.match(again.stderr,/never overwritten/)
 }
 console.log('Product workspace check passed: three local preparations, real baseline failures, reviewed fixes, no product/model launch and no overwrite.')
}finally{
 const target=fs.realpathSync(temporary), parent=fs.realpathSync(os.tmpdir())
 if(!target.startsWith(parent+path.sep)||!path.basename(target).startsWith('about-harness-product-'))throw new Error('Unsafe product cleanup path')
 fs.rmSync(target,{recursive:true,force:true})
}
