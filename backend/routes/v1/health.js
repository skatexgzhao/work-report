const express = require('express')
const { getDb } = require('../../lib/db')

const router = express.Router()

router.get('/health', (_req, res) => {
  res.json({
    status: 'UP',
    database: 'UP',
    ai: process.env.DEEPSEEK_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED'
  })
})

router.get('/ready', (_req, res) => {
  try {
    getDb()
    res.json({ status: 'UP', database: 'UP' })
  } catch {
    res.status(503).json({ status: 'DOWN', database: 'DOWN' })
  }
})

module.exports = router
