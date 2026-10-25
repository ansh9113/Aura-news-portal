import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
// Tiny .env loader using Node built-ins; existing process environment always wins.
try {
  const envText = await fs.readFile(path.join(root, '.env'), 'utf8')
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
} catch {}
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(root, 'data')
const articlesFile = path.join(dataDir, 'articles.json')
const port = Number(process.env.PORT || process.env.API_PORT || 8787)
const adminUser = process.env.ADMIN_USERNAME || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe-123!'
const sessionTokens = new Map()
const maxBodyBytes = 2 * 1024 * 1024

await fs.mkdir(dataDir, { recursive: true })
try { await fs.access(articlesFile) } catch { await fs.writeFile(articlesFile, '[]\n', 'utf8') }

const send = (res, status, data, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(JSON.stringify(data))
}
const readBody = req => new Promise((resolve, reject) => {
  let body = ''
  req.on('data', chunk => {
    body += chunk
    if (Buffer.byteLength(body) > maxBodyBytes) {
      reject(new Error('Request too large'))
      req.destroy()
    }
  })
  req.on('end', () => {
    try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('Invalid JSON')) }
  })
  req.on('error', reject)
})
const getArticles = async () => JSON.parse(await fs.readFile(articlesFile, 'utf8'))
const saveArticles = async articles => fs.writeFile(articlesFile, JSON.stringify(articles, null, 2) + '\n', 'utf8')
const cookieValue = req => {
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('aura_session='))
  return cookie ? decodeURIComponent(cookie.slice('aura_session='.length)) : ''
}
const isAdmin = req => {
  const token = cookieValue(req)
  const expiry = sessionTokens.get(token)
  if (!token || !expiry || expiry < Date.now()) {
    if (token) sessionTokens.delete(token)
    return false
  }
  return true
}
const safeArticle = a => ({
  id: a.id, slug: a.slug, category: a.category, title_en: a.title_en || null, title_hi: a.title_hi || null,
  excerpt_en: a.excerpt_en || null, excerpt_hi: a.excerpt_hi || null, body_en: a.body_en || null,
  body_hi: a.body_hi || null, image_url: a.image_url || null, published_at: a.published_at || null,
  status: a.status, updated_at: a.updated_at
})
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const method = req.method || 'GET'
  try {
    if (url.pathname === '/api/health' && method === 'GET') return send(res, 200, { ok: true, storage: 'local-json-file' })

    if (url.pathname === '/api/session' && method === 'GET') {
      return send(res, 200, { authenticated: isAdmin(req), username: isAdmin(req) ? adminUser : null })
    }

    if (url.pathname === '/api/login' && method === 'POST') {
      const body = await readBody(req)
      if (body.username !== adminUser || body.password !== adminPassword) {
        return send(res, 401, { error: 'Invalid username or password.' })
      }
      const token = crypto.randomBytes(32).toString('hex')
      sessionTokens.set(token, Date.now() + 8 * 60 * 60 * 1000)
      return send(res, 200, { ok: true, username: adminUser }, {
        'Set-Cookie': `aura_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`
      })
    }

    if (url.pathname === '/api/logout' && method === 'POST') {
      const token = cookieValue(req)
      if (token) sessionTokens.delete(token)
      return send(res, 200, { ok: true }, { 'Set-Cookie': 'aura_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' })
    }

    if (url.pathname === '/api/articles' && method === 'GET') {
      const admin = isAdmin(req)
      const all = await getArticles()
      const filtered = admin || url.searchParams.get('all') !== '1'
        ? (admin ? all : all.filter(a => a.status === 'published'))
        : all.filter(a => a.status === 'published')
      filtered.sort((a, b) => new Date(b.published_at || b.updated_at || 0) - new Date(a.published_at || a.updated_at || 0))
      return send(res, 200, filtered.map(safeArticle))
    }

    if (url.pathname === '/api/articles' && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      if (!isAdmin(req)) return send(res, 403, { error: 'Admin sign-in required.' })
      const all = await getArticles()
      if (method === 'POST') {
        const body = await readBody(req)
        if (!body.title_en?.trim() && !body.title_hi?.trim()) return send(res, 400, { error: 'Add an English or Hindi headline.' })
        const title = body.title_en || body.title_hi || 'article'
        const slug = (body.slug || title).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || `story-${Date.now()}`
        const article = { ...body, id: crypto.randomUUID(), slug, status: body.status === 'published' ? 'published' : 'draft', published_at: body.status === 'published' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }
        all.push(article)
        await saveArticles(all)
        return send(res, 201, safeArticle(article))
      }
      if (method === 'PUT') {
        const body = await readBody(req)
        if (!body.id) return send(res, 400, { error: 'Article ID is required.' })
        const index = all.findIndex(a => a.id === body.id)
        if (index < 0) return send(res, 404, { error: 'Article not found.' })
        if (!body.title_en?.trim() && !body.title_hi?.trim()) return send(res, 400, { error: 'Add an English or Hindi headline.' })
        const previous = all[index]
        const title = body.title_en || body.title_hi || 'article'
        const slug = (body.slug || title).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || `story-${Date.now()}`
        all[index] = { ...previous, ...body, slug, status: body.status === 'published' ? 'published' : 'draft', published_at: body.status === 'published' ? (previous.published_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() }
        await saveArticles(all)
        return send(res, 200, safeArticle(all[index]))
      }
      const body = await readBody(req)
      const remaining = all.filter(a => a.id !== body.id)
      if (remaining.length === all.length) return send(res, 404, { error: 'Article not found.' })
      await saveArticles(remaining)
      return send(res, 200, { ok: true })
    }

   
    if (url.pathname.startsWith('/api/')) {
      return send(res, 404, { error: 'Not found.' })
    }

    const distDir = path.join(root, 'dist')
    const requestedPath = decodeURIComponent(
      url.pathname === '/' ? '/index.html' : url.pathname
    )
    const filePath = path.resolve(distDir, `.${requestedPath}`)

    if (!filePath.startsWith(distDir + path.sep)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }

    try {
      const stat = await fs.stat(filePath)
      const actualPath = stat.isDirectory()
        ? path.join(filePath, 'index.html')
        : filePath

      const content = await fs.readFile(actualPath)
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon'
      }

      res.writeHead(200, {
        'Content-Type': types[path.extname(actualPath).toLowerCase()]
          || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff'
      })
      return res.end(content)
    } catch {
      // Support client-side React routes.
      if (path.extname(requestedPath)) {
        res.writeHead(404)
        return res.end('Not found')
      }

      try {
        const html = await fs.readFile(path.join(distDir, 'index.html'))
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        return res.end(html)
      } catch {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('Frontend build not found. Run npm run build.')
      }
    }

  } catch (error) {
    console.error(error)
    return send(res, 500, { error: error?.message || 'Internal server error.' })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`AURA API ready at http://127.0.0.1:${port}`)
  if (adminPassword === 'ChangeMe-123!') console.warn('DEVELOPMENT ADMIN PASSWORD IS IN USE. Set ADMIN_PASSWORD in .env before exposing this server to a network.')
})
