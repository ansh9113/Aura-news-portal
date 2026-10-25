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
const dataDir = path.join(root, 'data')
const articlesFile = path.join(dataDir, 'articles.json')
const uploadsDir = path.join(dataDir, 'uploads')
const port = Number(process.env.API_PORT || 8787)
const adminUser = process.env.ADMIN_USERNAME || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe-123!'
const sessionTokens = new Map()
const maxBodyBytes = 2 * 1024 * 1024

await fs.mkdir(dataDir, { recursive: true })
await fs.mkdir(uploadsDir, { recursive: true })
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

const readUpload = req => new Promise((resolve, reject) => {
  const chunks = []
  let total = 0
  const maxBytes = 5 * 1024 * 1024 + 64 * 1024
  req.on('data', chunk => {
    total += chunk.length
    if (total > maxBytes) {
      reject(new Error('Image must be 5 MB or smaller.'))
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    try {
      const contentType = req.headers['content-type'] || ''
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
      if (!boundaryMatch) throw new Error('Invalid image upload request.')
      const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`)
      const body = Buffer.concat(chunks)
      const start = body.indexOf(Buffer.from('\r\n\r\n'))
      if (start < 0) throw new Error('No image file was received.')
      const headerText = body.subarray(0, start).toString('utf8')
      if (!/name="image"/i.test(headerText) || !/filename="/i.test(headerText)) throw new Error('Choose an image file to upload.')
      const dataStart = start + 4
      const endMarker = Buffer.concat([Buffer.from('\r\n'), boundary])
      const dataEnd = body.indexOf(endMarker, dataStart)
      if (dataEnd < 0) throw new Error('Invalid image upload data.')
      const file = body.subarray(dataStart, dataEnd)
      const mimeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i)
      const mime = (mimeMatch?.[1] || '').trim().toLowerCase()
      if (!file.length) throw new Error('The selected image is empty.')
      if (file.length > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.')
      let ext = ''
      if (mime === 'image/jpeg' && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) ext = '.jpg'
      else if (mime === 'image/png' && file.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ext = '.png'
      else if (mime === 'image/webp' && file.toString('ascii', 0, 4) === 'RIFF' && file.toString('ascii', 8, 12) === 'WEBP') ext = '.webp'
      else throw new Error('Only valid JPG, PNG, or WebP images are supported.')
      resolve({ file, ext })
    } catch (error) { reject(error) }
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
    if (url.pathname.startsWith('/uploads/') && method === 'GET') {
      const name = path.basename(url.pathname.slice('/uploads/'.length))
      if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name)) return send(res, 404, { error: 'Image not found.' })
      try {
        const file = await fs.readFile(path.join(uploadsDir, name))
        const type = name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.png') ? 'image/png' : 'image/webp'
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' })
        return res.end(file)
      } catch { return send(res, 404, { error: 'Image not found.' }) }
    }

    if (url.pathname === '/api/upload' && method === 'POST') {
      if (!isAdmin(req)) return send(res, 403, { error: 'Admin sign-in required.' })
      const { file, ext } = await readUpload(req)
      const name = `${crypto.randomUUID()}${ext}`
      await fs.writeFile(path.join(uploadsDir, name), file, { flag: 'wx' })
      return send(res, 201, { url: `/uploads/${name}` })
    }

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

    return send(res, 404, { error: 'Not found.' })
  } catch (error) {
    console.error(error)
    const message = error?.message || 'Internal server error.'
    const status = /5 MB|too large/i.test(message) ? 413 : /image|upload|choose|invalid/i.test(message) ? 400 : 500
    return send(res, status, { error: message })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`AURA API ready at http://127.0.0.1:${port}`)
  if (adminPassword === 'ChangeMe-123!') console.warn('DEVELOPMENT ADMIN PASSWORD IS IN USE. Set ADMIN_PASSWORD in .env before exposing this server to a network.')
})
