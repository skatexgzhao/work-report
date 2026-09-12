const express = require('express')
const { authenticateToken } = require('../../middleware/auth')
const { v1Error } = require('../../middleware/v1Respond')
const teamService = require('../../services/teamService')
const { AppError } = require('../../lib/errors')

const router = express.Router()

function handleServiceError(err, res, next) {
  if (err instanceof AppError) {
    return v1Error(res, err.code, err.message, err.statusCode)
  }
  next(err)
}

router.get('/teams', authenticateToken, async (req, res, next) => {
  try {
    const rows = await teamService.listTeams(req.db, req.user, {
      departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined
    })
    res.json(rows)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/teams/members', authenticateToken, async (req, res, next) => {
  try {
    const rows = await teamService.listDepartmentMembers(req.db, req.user)
    res.json(rows)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.get('/teams/:id', authenticateToken, async (req, res, next) => {
  try {
    const team = await teamService.getTeam(req.db, req.user, Number(req.params.id))
    res.json(team)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.post('/teams', authenticateToken, async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.db, req.user, req.body)
    res.status(201).json(team)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

router.put('/teams/:id', authenticateToken, async (req, res, next) => {
  try {
    const team = await teamService.updateTeam(req.db, req.user, Number(req.params.id), req.body)
    res.json(team)
  } catch (err) {
    handleServiceError(err, res, next)
  }
})

module.exports = router
