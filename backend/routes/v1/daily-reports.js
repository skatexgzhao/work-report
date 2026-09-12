const express = require('express')
const { authenticateToken } = require('../../middleware/auth')
const { assertResourceOwner } = require('../../middleware/authorize')
const { v1Error } = require('../../middleware/v1Respond')
const dailyReportService = require('../../services/dailyReportService')
const { AppError } = require('../../lib/errors')

const router = express.Router()

function handleServiceError(err, res, next) {
  if (err instanceof AppError) {
    return v1Error(res, err.code, err.message, err.statusCode)
  }
  next(err)
}

router.get('/daily-reports', authenticateToken, async (req, res, next) => {
  try {
    const rows = await dailyReportService.listReports(req.db, req.user, {
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.pageSize
    })
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

router.get('/daily-reports/template', authenticateToken, async (req, res, next) => {
  try {
    const template = await dailyReportService.getActiveDailyTemplateVersion(req.db)
    res.json({
      templateVersionId: template.id,
      formSchema: dailyReportService.parseFormSchema(template.form_schema)
    })
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/daily-reports/:id', authenticateToken, async (req, res, next) => {
  try {
    const report = await dailyReportService.getReport(req.db, req.params.id)
    if (!report) {
      return v1Error(res, 'REPORT_NOT_FOUND', '报告不存在', 404)
    }
    if (!assertResourceOwner(req, res, report.user_id)) {
      return
    }
    res.json(report)
  } catch (err) {
    next(err)
  }
})

router.post('/daily-reports', authenticateToken, async (req, res, next) => {
  try {
    const report = await dailyReportService.createReport(req.db, req.user, {
      reportDate: req.body.reportDate,
      content: req.body.content
    })
    res.status(201).json(report)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.put('/daily-reports/:id', authenticateToken, async (req, res, next) => {
  try {
    const report = await dailyReportService.updateReport(req.db, req.user, req.params.id, req.body.content)
    res.json(report)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/daily-reports/:id/submit', authenticateToken, async (req, res, next) => {
  try {
    const report = await dailyReportService.submitReport(req.db, req.user, req.params.id)
    res.json(report)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/daily-reports/:id/revise', authenticateToken, async (req, res, next) => {
  try {
    const report = await dailyReportService.reviseReport(req.db, req.user, req.params.id)
    res.json(report)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

module.exports = router
