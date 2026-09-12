const express = require('express')
const { authenticateToken } = require('../../middleware/auth')
const { v1Error } = require('../../middleware/v1Respond')
const periodReportService = require('../../services/periodReportService')
const aiService = require('../../services/aiService')
const { AppError } = require('../../lib/errors')

const router = express.Router()

function handleServiceError(err, res, next) {
  if (err instanceof AppError) {
    return v1Error(res, err.code, err.message, err.statusCode)
  }
  next(err)
}

router.get('/period-reports/source-options', authenticateToken, async (req, res, next) => {
  try {
    const reportType = req.query.reportType
    if (!reportType) {
      return v1Error(res, 'VALIDATION_ERROR', 'reportType 不能为空', 400)
    }
    res.json(periodReportService.getSourceOptions(reportType))
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/period-reports', authenticateToken, async (req, res, next) => {
  try {
    const rows = await periodReportService.listReports(req.db, req.user, {
      scope: req.query.scope || 'personal',
      reportType: req.query.reportType,
      teamId: req.query.teamId ? Number(req.query.teamId) : undefined,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.pageSize
    })
    res.json(rows)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/period-reports', authenticateToken, async (req, res, next) => {
  try {
    const report = await periodReportService.createReport(req.db, req.user, req.body)
    res.status(201).json(report)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/period-reports/:id/source-data', authenticateToken, async (req, res, next) => {
  try {
    const data = await periodReportService.getSourceData(req.db, req.user, req.params.id, req.query)
    res.json(data)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/period-reports/:id/member-status', authenticateToken, async (req, res, next) => {
  try {
    const data = await periodReportService.getMemberSubmissionStatus(req.db, req.user, req.params.id, req.query)
    res.json(data)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/period-reports/:id', authenticateToken, async (req, res, next) => {
  try {
    const report = await periodReportService.getReport(req.db, req.user, req.params.id)
    res.json(report)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.put('/period-reports/:id/generation-focus', authenticateToken, async (req, res, next) => {
  try {
    const report = await periodReportService.updateGenerationFocus(
      req.db,
      req.user,
      req.params.id,
      req.body.generationFocus ?? req.body.generation_focus ?? ''
    )
    res.json(report)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.put('/period-reports/:id/source-config', authenticateToken, async (req, res, next) => {
  try {
    const result = await periodReportService.updateSourceConfig(
      req.db,
      req.user,
      req.params.id,
      req.body.sourceConfig || req.body
    )
    res.json(result)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.put('/period-reports/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await periodReportService.saveDraft(req.db, req.user, req.params.id, req.body.content)
    res.json(result)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/period-reports/:id/submit', authenticateToken, async (req, res, next) => {
  try {
    const result = await periodReportService.submitReport(req.db, req.user, req.params.id)
    res.json(result)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/period-reports/:id/revise', authenticateToken, async (req, res, next) => {
  try {
    const result = await periodReportService.reviseReport(req.db, req.user, req.params.id)
    res.json(result)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/period-reports/:id/generate', authenticateToken, async (req, res, next) => {
  try {
    const result = await aiService.generateReport(req.db, req.user, req.params.id)
    res.json(result)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

module.exports = router
