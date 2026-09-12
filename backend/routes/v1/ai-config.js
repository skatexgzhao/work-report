const express = require('express')
const { authenticateToken } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/authorize')
const { v1Error } = require('../../middleware/v1Respond')
const aiConfigService = require('../../services/aiConfigService')
const { AppError } = require('../../lib/errors')

const router = express.Router()

function handleServiceError(err, res, next) {
  if (err instanceof AppError) {
    return v1Error(res, err.code, err.message, err.statusCode)
  }
  next(err)
}

router.get('/ai-config', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const config = await aiConfigService.getConfig(req.db)
    res.json({
      ...config,
      providerPresets: aiConfigService.listProviderPresetsForApi()
    })
  } catch (err) {
    next(err)
  }
})

router.put('/ai-config', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    res.json(await aiConfigService.updateConfig(req.db, req.body))
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

module.exports = router
