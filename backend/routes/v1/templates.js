const express = require('express')
const { authenticateToken } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/authorize')
const { v1Error } = require('../../middleware/v1Respond')
const templateService = require('../../services/templateService')
const templateDeriveService = require('../../services/templateDeriveService')
const { AppError } = require('../../lib/errors')

const router = express.Router()

function handleServiceError(err, res, next) {
  if (err instanceof AppError) {
    return v1Error(res, err.code, err.message, err.statusCode)
  }
  next(err)
}

router.get('/templates', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    res.json(await templateService.listTemplates(req.db))
  } catch (err) {
    next(err)
  }
})

router.get('/templates/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    res.json(await templateService.getTemplate(req.db, req.params.id))
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/templates', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const created = await templateService.createTemplate(req.db, req.user, req.body)
    res.status(201).json(created)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.put('/templates/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    res.json(await templateService.updateTemplate(req.db, req.params.id, req.body))
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/templates/derive-from-sample', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await templateDeriveService.deriveFromSample(req.db, {
      sampleMarkdown: req.body.sampleMarkdown,
      reportType: req.body.reportType
    })
    res.json(result)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/templates/:id/versions', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const updated = await templateService.createTemplateVersion(req.db, req.user, req.params.id, {
      formSchema: req.body.formSchema,
      promptTemplate: req.body.promptTemplate,
      outputSchema: req.body.outputSchema
    })
    res.status(201).json(updated)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

module.exports = router
