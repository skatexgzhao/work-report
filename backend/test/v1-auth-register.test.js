const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-register'
process.env.PUBLIC_REGISTRATION = 'true'
process.env.DB_PATH = path.join(__dirname, 'test-register.db')

if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH)
}

const { closeDb } = require('../lib/db')
const { bootstrapDatabase } = require('../bootstrap')
const { app } = require('../server')
const { get } = require('../lib/dbUtil')

function token(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
}

describe('V1 public registration and admin role', () => {
  let db
  let deptId
  let admin

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
    const dept = await get(db, "SELECT id FROM departments WHERE name = '技术部'")
    deptId = dept.id
    admin = await get(
      db,
      `SELECT u.id, ud.department_id FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'admin'`
    )
  })

  it('GET /departments/public returns active departments without auth', async () => {
    const res = await request(app).get('/api/v1/departments/public')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
    assert.ok(res.body.some((d) => d.id === deptId))
  })

  it('POST /auth/register creates employee with department', async () => {
    const username = `reg_user_${Date.now()}`
    const res = await request(app).post('/api/v1/auth/register').send({
      username,
      password: 'secret1',
      departmentId: deptId
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.user.role, 'employee')
    assert.equal(res.body.user.departmentId, deptId)

    const row = await get(db, 'SELECT role FROM users WHERE username = ?', [username])
    assert.equal(row.role, 'employee')
  })

  it('admin can promote user to manager', async () => {
    const username = `promote_${Date.now()}`
    const reg = await request(app).post('/api/v1/auth/register').send({
      username,
      password: 'secret1',
      departmentId: deptId
    })
    const userId = reg.body.user.id
    const adminToken = token({
      userId: admin.id,
      username: 'admin',
      role: 'admin',
      departmentId: admin.department_id
    })
    const res = await request(app)
      .put(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'manager' })
    assert.equal(res.status, 200)
    assert.equal(res.body.role, 'manager')
  })

  it('admin cannot change own role', async () => {
    const adminToken = token({
      userId: admin.id,
      username: 'admin',
      role: 'admin',
      departmentId: admin.department_id
    })
    const res = await request(app)
      .put(`/api/v1/users/${admin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'employee' })
    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'VALIDATION_ERROR')
  })
})
