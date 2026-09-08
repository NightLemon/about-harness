import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright'
const dist=path.resolve('docs/.vitepress/dist')
const base=process.env.DOCS_BASE||'/'
const maps=JSON.parse(fs.readFileSync('docs/.vitepress/legacy-links.json','utf8'))
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local.test')
 if(!url.pathname.startsWith(base)){res.writeHead(404);res.end();return}
 let relative=decodeURIComponent(url.pathname.slice(base.length))||'index.html'
 if(!path.extname(relative))relative+='.html'
 const file=path.resolve(dist,relative)
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin=`http://127.0.0.1:${server.address().port}`
let browser
let redirects=0
try{
 browser=await chromium.launch({headless:true})
 const page=await browser.newPage()
 const failures=[]
 page.on('pageerror',error=>failures.push(error.message))
 await page.goto(origin+base)
 const navLinks=await page.locator('nav a, aside a').evaluateAll(links=>links.map(a=>new URL(a.href).pathname))
 for(const route of Object.keys(maps))assert.ok(!navLinks.includes(base+route.slice(1)))
 for(const [route,entry] of Object.entries(maps)){
  const staticPage=await browser.newPage({javaScriptEnabled:false})
  assert.equal((await staticPage.goto(origin+base+route.slice(1))).status(),200)
  const targets=await staticPage.locator('main a').evaluateAll(links=>links.map(a=>a.getAttribute('href')))
  assert.ok(targets.includes(base+entry.target.slice(1)))
  for(const anchor of Object.keys(entry.anchors))assert.ok(await staticPage.evaluate(id=>!!document.getElementById(id),anchor))
  await staticPage.close()
  for(const [anchor,mapped] of [['',''],...Object.entries(entry.anchors)]){
   await page.goto(origin+base+route.slice(1)+(anchor?'#'+encodeURIComponent(anchor):''),{waitUntil:'domcontentloaded'})
   const expected=base+entry.target.slice(1)
   await page.waitForURL(url=>url.pathname===expected&&decodeURIComponent(url.hash.slice(1))===mapped,{timeout:10000})
   if(mapped)await page.waitForFunction(id=>!!document.getElementById(id),mapped)
   redirects++
  }
 }
 assert.deepEqual(failures,[])
 console.log(`Legacy routes passed: ${redirects} JavaScript redirects, 3 static migration pages, navigation exclusion, base ${base}.`)
}finally{
 if(browser)await browser.close()
 await new Promise(resolve=>server.close(resolve))
}
