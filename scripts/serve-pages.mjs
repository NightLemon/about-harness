import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const root = process.cwd()
const dist = path.resolve(root, 'docs', '.vitepress', 'dist')
const portIndex = process.argv.indexOf('--port')
const port = Number(portIndex === -1 ? 4173 : process.argv[portIndex + 1])
const base = '/about-harness/'

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Pages server failed: --port must be an integer between 1 and 65535')
  process.exit(2)
}
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Pages server failed: build the project-base site before serving it')
  process.exit(1)
}

const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
])

function fileForRequest(rawUrl) {
  const pathname = decodeURIComponent(new URL(rawUrl, 'http://local.test').pathname)
  if (!pathname.startsWith(base)) return null
  let relative = pathname.slice(base.length)
  if (!relative || relative.endsWith('/')) relative += 'index.html'
  else if (!path.extname(relative)) {
    const cleanUrl = path.join(dist, `${relative}.html`)
    relative = fs.existsSync(cleanUrl) ? `${relative}.html` : path.join(relative, 'index.html')
  }
  const resolved = path.resolve(dist, relative)
  if (resolved !== dist && !resolved.startsWith(`${dist}${path.sep}`)) return null
  return resolved
}

const server = http.createServer((request, response) => {
  const file = fileForRequest(request.url || '/')
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('not found')
    return
  }
  response.writeHead(200, { 'content-type': mime.get(path.extname(file)) || 'application/octet-stream' })
  fs.createReadStream(file).pipe(response)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Project-base site served at http://127.0.0.1:${port}${base}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
