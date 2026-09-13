const express = require('express')
const bcrypt = require('bcryptjs')
const { v1Error } = require('../../middleware/v1Respond')
const { get, run } = require('../../lib/dbUtil')
const teamRepo = require('../../repositories/teamRepo')

const router = express.Router()

function isPublicRegistrationEnabled() {
  return process.env.PUBLIC_REGISTRATION !== 'false'
}

async function linkUserDepartment(db, userId, departmentId) {
  const dept = await get(db, 'SELECT id, name FROM departments WHERE id = ? AND status = ?', [
    departmentId,
    'ACTIVE'
  ])
  if (!dept) {
    return null
  }
  await run(db, 'DELETE FROM user_departments WHERE user_id = ?', [userId])
  await run(db, 'INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)', [userId, departmentId])
  await run(db, 'UPDATE users SET department = ? WHERE id = ?', [dept.name, userId])
  return dept
}

router.post('/auth/register', async (req, res, next) => {
  try {
    if (!isPublicRegistrationEnabled()) {
      return v1Error(res, 'REGISTRATION_DISABLED', '当前未开放自助注册', 403)
    }

    const { username, password, departmentId, teamId } = req.body
    const trimmedUsername = String(username || '').trim()
    if (!trimmedUsername || !password) {
      return v1Error(res, 'VALIDATION_ERROR', '用户名和密码不能为空', 400)
    }
    if (trimmedUsername.length < 2 || trimmedUsername.length > 32) {
      return v1Error(res, 'VALIDATION_ERROR', '用户名长度需在 2–32 个字符', 400)
    }
    if (String(password).length < 6) {
      return v1Error(res, 'VALIDATION_ERROR', '密码至少 6 位', 400)
    }
    const deptId = Number(departmentId)
    if (!Number.isInteger(deptId) || deptId <= 0) {
      return v1Error(res, 'VALIDATION_ERROR', '请选择部门', 400)
    }

    const existing = await get(req.db, 'SELECT id FROM users WHERE username = ?', [trimmedUsername])
    if (existing) {
      return v1Error(res, 'USER_EXISTS', '用户名已存在', 409)
    }

    const hashedPassword = await bcrypt.hash(String(password), 10)
    const result = await run(
      req.db,
      'INSERT INTO users (username, password, role, department) VALUES (?, ?, ?, ?)',
      [trimmedUsername, hashedPassword, 'employee', null]
    )

    const linked = await linkUserDepartment(req.db, result.lastID, deptId)
    if (!linked) {
      await run(req.db, 'DELETE FROM users WHERE id = ?', [result.lastID])
      return v1Error(res, 'VALIDATION_ERROR', '所选部门无效或已停用', 400)
    }

    let joinedTeamId = null
    if (teamId != null && teamId !== '') {
      const tid = Number(teamId)
      if (!Number.isInteger(tid) || tid <= 0) {
        await run(req.db, 'DELETE FROM users WHERE id = ?', [result.lastID])
        return v1Error(res, 'VALIDATION_ERROR', '小组无效', 400)
      }
      const team = await teamRepo.findById(req.db, tid)
      if (!team || team.status !== 'ACTIVE' || team.department_id !== deptId) {
        await run(req.db, 'DELETE FROM users WHERE id = ?', [result.lastID])
        return v1Error(res, 'VALIDATION_ERROR', '小组与所选部门不匹配或已停用', 400)
      }
      await teamRepo.addMember(req.db, tid, result.lastID)
      joinedTeamId = tid
    } else {
      const publicTeams = await teamRepo.listPublicByDepartment(req.db, deptId)
      if (publicTeams.length > 0) {
        await run(req.db, 'DELETE FROM users WHERE id = ?', [result.lastID])
        return v1Error(res, 'VALIDATION_ERROR', '该部门已开通小组，注册时请选择所属小组', 400)
      }
    }

    const created = await get(
      req.db,
      `SELECT u.id, u.username, u.role, u.department, ud.department_id
       FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id
       WHERE u.id = ?`,
      [result.lastID]
    )

    res.status(201).json({
      message: '注册成功，请登录',
      user: {
        id: created.id,
        username: created.username,
        role: created.role,
        department: created.department,
        departmentId: created.department_id,
        teamId: joinedTeamId
      }
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
