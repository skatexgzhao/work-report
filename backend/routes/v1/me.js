const express = require('express')
const { authenticateToken } = require('../../middleware/auth')

const router = express.Router()

router.get('/me', authenticateToken, (req, res) => {
  const db = req.db
  db.get(
    `SELECT u.id, u.username, u.role, u.department, ud.department_id
     FROM users u
     LEFT JOIN user_departments ud ON ud.user_id = u.id
     WHERE u.id = ?`,
    [req.user.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ code: 'DATABASE_ERROR', message: '数据库错误', requestId: res.locals.requestId })
      }
      if (!user) {
        return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在', requestId: res.locals.requestId })
      }
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department,
        departmentId: user.department_id
      })
    }
  )
})

router.get('/me/department', authenticateToken, (req, res) => {
  const db = req.db
  db.get(
    `SELECT d.id, d.name, d.status
     FROM user_departments ud
     JOIN departments d ON d.id = ud.department_id
     WHERE ud.user_id = ?`,
    [req.user.userId],
    (err, department) => {
      if (err) {
        return res.status(500).json({ code: 'DATABASE_ERROR', message: '数据库错误', requestId: res.locals.requestId })
      }
      if (!department) {
        return res.status(404).json({ code: 'DEPARTMENT_NOT_FOUND', message: '未分配部门', requestId: res.locals.requestId })
      }
      res.json(department)
    }
  )
})

module.exports = router
