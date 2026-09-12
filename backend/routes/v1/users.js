const express = require('express')
const bcrypt = require('bcryptjs')
const { authenticateToken } = require('../../middleware/auth')
const { requireAdmin, requireManagerOrAdmin, assertSameDepartmentUnlessAdmin } = require('../../middleware/authorize')
const { v1Error } = require('../../middleware/v1Respond')
const { get, all, run } = require('../../lib/dbUtil')

const router = express.Router()

async function linkUserDepartment(db, userId, departmentId, departmentName) {
  if (departmentId) {
    await run(db, 'DELETE FROM user_departments WHERE user_id = ?', [userId])
    await run(db, 'INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)', [userId, departmentId])
    const dept = await get(db, 'SELECT name FROM departments WHERE id = ?', [departmentId])
    if (dept) {
      await run(db, 'UPDATE users SET department = ? WHERE id = ?', [dept.name, userId])
    }
    return
  }
  if (departmentName) {
    const dept = await get(db, 'SELECT id, name FROM departments WHERE name = ?', [departmentName])
    if (dept) {
      await linkUserDepartment(db, userId, dept.id, dept.name)
    } else {
      await run(db, 'UPDATE users SET department = ? WHERE id = ?', [departmentName, userId])
    }
  }
}

router.get('/users', authenticateToken, requireManagerOrAdmin, async (req, res, next) => {
  try {
    let rows
    if (req.user.role === 'admin') {
      rows = await all(
        req.db,
        `SELECT u.id, u.username, u.role, u.department, ud.department_id, u.created_at
         FROM users u
         LEFT JOIN user_departments ud ON ud.user_id = u.id
         ORDER BY u.created_at DESC`
      )
    } else {
      rows = await all(
        req.db,
        `SELECT u.id, u.username, u.role, u.department, ud.department_id, u.created_at
         FROM users u
         JOIN user_departments ud ON ud.user_id = u.id
         WHERE ud.department_id = ?
         ORDER BY u.created_at DESC`,
        [req.user.departmentId]
      )
    }
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

router.post('/users', authenticateToken, requireManagerOrAdmin, async (req, res, next) => {
  try {
    const { username, password, role = 'employee', departmentId, department } = req.body
    if (!username || !password) {
      return v1Error(res, 'VALIDATION_ERROR', '用户名和密码不能为空', 400)
    }
    if (!['employee', 'manager'].includes(role) && req.user.role !== 'admin') {
      return v1Error(res, 'FORBIDDEN', '无权创建该角色', 403)
    }
    if (req.user.role === 'admin' && !['employee', 'manager', 'admin'].includes(role)) {
      return v1Error(res, 'VALIDATION_ERROR', '无效角色', 400)
    }

    const targetDepartmentId = departmentId || req.user.departmentId
    if (req.user.role === 'manager') {
      if (departmentId && departmentId !== req.user.departmentId) {
        return v1Error(res, 'FORBIDDEN', '只能在本部门创建用户', 403)
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const deptRow = targetDepartmentId
      ? await get(req.db, 'SELECT name FROM departments WHERE id = ?', [targetDepartmentId])
      : null

    const result = await run(
      req.db,
      'INSERT INTO users (username, password, role, department) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, deptRow?.name || department || null]
    )

    await linkUserDepartment(req.db, result.lastID, targetDepartmentId, department)

    const created = await get(
      req.db,
      `SELECT u.id, u.username, u.role, u.department, ud.department_id
       FROM users u LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.id = ?`,
      [result.lastID]
    )
    res.status(201).json(created)
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return v1Error(res, 'USER_EXISTS', '用户名已存在', 409)
    }
    next(err)
  }
})

router.put('/users/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { role, departmentId, department } = req.body
    const targetId = parseInt(req.params.id, 10)
    const existing = await get(req.db, 'SELECT id, role FROM users WHERE id = ?', [targetId])
    if (!existing) {
      return v1Error(res, 'USER_NOT_FOUND', '用户不存在', 404)
    }
    if (role) {
      if (!['employee', 'manager', 'admin'].includes(role)) {
        return v1Error(res, 'VALIDATION_ERROR', '无效角色', 400)
      }
      if (targetId === req.user.userId && role !== existing.role) {
        return v1Error(res, 'VALIDATION_ERROR', '不能修改自己的角色', 400)
      }
      await run(req.db, 'UPDATE users SET role = ? WHERE id = ?', [role, targetId])
    }
    if (departmentId || department) {
      await linkUserDepartment(req.db, req.params.id, departmentId, department)
    }
    const updated = await get(
      req.db,
      `SELECT u.id, u.username, u.role, u.department, ud.department_id
       FROM users u LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.id = ?`,
      [req.params.id]
    )
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

router.delete('/users/:id', authenticateToken, requireManagerOrAdmin, async (req, res, next) => {
  try {
    if (parseInt(req.params.id, 10) === req.user.userId) {
      return v1Error(res, 'VALIDATION_ERROR', '不能删除自己的账户', 400)
    }
    const target = await get(
      req.db,
      `SELECT u.id, ud.department_id FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.id = ?`,
      [req.params.id]
    )
    if (!target) {
      return v1Error(res, 'USER_NOT_FOUND', '用户不存在', 404)
    }
    if (req.user.role === 'manager') {
      if (!assertSameDepartmentUnlessAdmin(req, res, target.department_id)) {
        return
      }
    }
    await run(req.db, 'DELETE FROM user_departments WHERE user_id = ?', [req.params.id])
    await run(req.db, 'DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ message: '用户已删除' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
