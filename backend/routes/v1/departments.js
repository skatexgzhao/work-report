const express = require('express')
const { authenticateToken } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/authorize')
const { v1Error } = require('../../middleware/v1Respond')
const { get, all, run } = require('../../lib/dbUtil')

const router = express.Router()

/** 自助注册用：仅返回启用中的部门 id + 名称，无需登录 */
router.get('/departments/public', async (req, res, next) => {
  try {
    const rows = await all(
      req.db,
      `SELECT id, name FROM departments WHERE status = 'ACTIVE' ORDER BY name`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

/** 自助注册用：按部门列出可加入的小组（无需登录） */
router.get('/teams/public', async (req, res, next) => {
  try {
    const departmentId = Number(req.query.departmentId)
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return v1Error(res, 'VALIDATION_ERROR', '请提供有效的 departmentId', 400)
    }
    const dept = await get(req.db, 'SELECT id FROM departments WHERE id = ? AND status = ?', [
      departmentId,
      'ACTIVE'
    ])
    if (!dept) {
      return v1Error(res, 'VALIDATION_ERROR', '部门无效或已停用', 400)
    }
    const teamRepo = require('../../repositories/teamRepo')
    const rows = await teamRepo.listPublicByDepartment(req.db, departmentId)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

router.get('/departments', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const rows = await all(req.db, 'SELECT id, name, status, created_at, updated_at FROM departments ORDER BY name')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

router.get('/departments/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const row = await get(req.db, 'SELECT id, name, status, created_at, updated_at FROM departments WHERE id = ?', [req.params.id])
    if (!row) {
      return v1Error(res, 'DEPARTMENT_NOT_FOUND', '部门不存在', 404)
    }
    res.json(row)
  } catch (err) {
    next(err)
  }
})

router.post('/departments', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || !String(name).trim()) {
      return v1Error(res, 'VALIDATION_ERROR', '部门名称不能为空', 400)
    }
    const result = await run(
      req.db,
      `INSERT INTO departments (name, status) VALUES (?, 'ACTIVE')`,
      [String(name).trim()]
    )
    const created = await get(req.db, 'SELECT id, name, status, created_at, updated_at FROM departments WHERE id = ?', [result.lastID])
    res.status(201).json(created)
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return v1Error(res, 'DEPARTMENT_EXISTS', '部门名称已存在', 409)
    }
    next(err)
  }
})

router.put('/departments/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { name, status } = req.body
    const existing = await get(req.db, 'SELECT id FROM departments WHERE id = ?', [req.params.id])
    if (!existing) {
      return v1Error(res, 'DEPARTMENT_NOT_FOUND', '部门不存在', 404)
    }
    if (name != null) {
      await run(req.db, 'UPDATE departments SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [String(name).trim(), req.params.id])
    }
    if (status != null) {
      await run(req.db, 'UPDATE departments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id])
    }
    const updated = await get(req.db, 'SELECT id, name, status, created_at, updated_at FROM departments WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

module.exports = router
