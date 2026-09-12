const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-phase2'
process.env.DB_PATH = path.join(__dirname, 'test-phase2.db')

if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH)
}

const { closeDb } = require('../lib/db')
const { bootstrapDatabase } = require('../bootstrap')
const { app } = require('../server')
const { run, get } = require('../lib/dbUtil')

function token(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
}

describe('V1 permissions', () => {
  let db

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
  })

  it('employee cannot list departments (403)', async () => {
    const employee = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`)
    const res = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'FORBIDDEN')
  })

  it('admin can list departments (200)', async () => {
    const admin = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'admin'`)
    const res = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token({ userId: admin.id, username: 'admin', role: 'admin', departmentId: admin.department_id })}`)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
  })

  it('employee cannot access another user daily report draft (403)', async () => {
    const employee = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`)
    const manager = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'manager'`)

    const dept = await get(db, 'SELECT id FROM departments WHERE name = ?', ['技术部'])
    const templateVersion = await get(db, 'SELECT id FROM template_versions LIMIT 1')

    const insert = await run(
      db,
      `INSERT INTO daily_reports (user_id, department_id, template_version_id, report_date, content_json, status)
       VALUES (?, ?, ?, '2026-09-11', '{}', 'DRAFT')`,
      [manager.id, dept.id, templateVersion.id]
    )

    const res = await request(app)
      .get(`/api/v1/daily-reports/${insert.lastID}`)
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)

    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'FORBIDDEN')
  })

  it('owner can access own daily report draft (200)', async () => {
    const employee = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`)
    const dept = await get(db, 'SELECT id FROM departments WHERE name = ?', ['技术部'])
    const templateVersion = await get(db, 'SELECT id FROM template_versions LIMIT 1')

    const insert = await run(
      db,
      `INSERT INTO daily_reports (user_id, department_id, template_version_id, report_date, content_json, status)
       VALUES (?, ?, ?, '2026-09-10', '{"completed":"done"}', 'DRAFT')`,
      [employee.id, dept.id, templateVersion.id]
    )

    const res = await request(app)
      .get(`/api/v1/daily-reports/${insert.lastID}`)
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'DRAFT')
  })
})
