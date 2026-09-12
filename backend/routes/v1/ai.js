const express = require('express')
const { authenticateToken } = require('../../middleware/auth')
const { v1Error } = require('../../middleware/v1Respond')
const aiService = require('../../services/aiService')
const { AppError } = require('../../lib/errors')

const router = express.Router()

function handleServiceError(err, res, next) {
  if (err instanceof AppError) {
    return v1Error(res, err.code, err.message, err.statusCode)
  }
  next(err)
}

router.post('/ai/generate-report', authenticateToken, async (req, res, next) => {
  try {
    const reportId = req.body.reportId
    if (!reportId) {
      return v1Error(res, 'VALIDATION_ERROR', 'reportId 不能为空', 400)
    }
    const result = await aiService.generateReport(req.db, req.user, reportId)
    res.json(result)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/ai/executions/:id', authenticateToken, async (req, res, next) => {
  try {
    const row = await aiService.getExecution(req.db, req.user, req.params.id)
    res.json(row)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

module.exports = router
