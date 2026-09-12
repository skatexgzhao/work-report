
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./lib/loadEnv')

loadEnv()

const { getDb } = require('./lib/db')
const { bootstrapDatabase } = require('./bootstrap')
const { errorHandler } = require('./lib/errors')
const requestIdMiddleware = require('./middleware/requestId')

const app = express()
const PORT = process.env.PORT || 3000

if (!process.env.JWT_SECRET && require.main === module) {
  console.error('JWT_SECRET is required. Please configure it in backend/.env')
  process.exit(1)
}

app.use(cors())
app.use(express.json())
app.use(requestIdMiddleware)

app.use((req, res, next) => {
  try {
    req.db = getDb()
    next()
  } catch (err) {
    next(err)
  }
})

app.use('/api/v1', require('./routes/v1'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/plans', require('./routes/plans'))
app.use('/api/reports', require('./routes/reports'))
app.use('/api/users', require('./routes/users'))
app.use('/api/ai-suggestions', require('./routes/ai-suggestions'))

function setupStaticFrontend() {
  if (process.env.SERVE_STATIC === 'false') return
  const staticDir =
    process.env.STATIC_DIR || path.join(__dirname, '..', 'frontend', 'dist')
  if (!fs.existsSync(path.join(staticDir, 'index.html'))) {
    return
  }
  app.use(express.static(staticDir))
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(staticDir, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

setupStaticFrontend()

app.use(errorHandler)

async function start() {
  await bootstrapDatabase()
  app.listen(PORT, () => {
    const dbPath = process.env.DB_PATH || require('./lib/db').DB_PATH
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`)
    console.log(`V1 health: http://localhost:${PORT}/api/v1/health`)
    console.log(`数据库文件: ${dbPath}`)
  })
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
}

module.exports = { app, start, bootstrapDatabase, getDb }
