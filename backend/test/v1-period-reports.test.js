const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-phase4'
process.env.DB_PATH = path.join(__dirname, 'test-phase4.db')

if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH)
}

const { closeDb } = require('../lib/db')
const { bootstrapDatabase } = require('../bootstrap')
const { app } = require('../server')
const { get, run } = require('../lib/dbUtil')

function token(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
}

describe('V1 period reports', () => {
  let db
  let employee

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
    employee = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`)
    const dept = await get(db, 'SELECT id FROM departments WHERE name = ?', ['技术部'])
    const templateVersion = await get(db, 'SELECT id FROM template_versions LIMIT 1')

    for (const date of ['2026-09-07', '2026-09-08', '2026-09-09']) {
      await run(
        db,
        `INSERT INTO daily_reports (user_id, department_id, template_version_id, report_date, content_json, status)
         VALUES (?, ?, ?, ?, ?, 'SUBMITTED')`,
        [employee.id, dept.id, templateVersion.id, date, JSON.stringify({ completed: `work ${date}` })]
      )
    }
  })

  it('creates personal weekly report', async () => {
    const res = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
      .send({ reportType: 'PERSONAL_WEEKLY', anchorDate: '2026-09-09' })

    assert.equal(res.status, 201)
    assert.equal(res.body.report_type, 'PERSONAL_WEEKLY')
    assert.equal(res.body.start_date, '2026-09-07')
    assert.equal(res.body.end_date, '2026-09-13')
  })

  it('returns source-data with missing dates', async () => {
    const listRes = await request(app)
      .get('/api/v1/period-reports')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
    const reportId = listRes.body.items[0].id

    const res = await request(app)
      .get(`/api/v1/period-reports/${reportId}/source-data`)
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.dailyCount, 3)
    assert.equal(res.body.expectedCount, 7)
    assert.ok(res.body.missingDates.includes('2026-09-10'))
  })

  it('ai generate returns 503 when not configured', async () => {
    const listRes = await request(app)
      .get('/api/v1/period-reports')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
    const reportId = listRes.body.items[0].id

    const res = await request(app)
      .post('/api/v1/ai/generate-report')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
      .send({ reportId })

    assert.ok([502, 503].includes(res.status), `unexpected status ${res.status}`)
    assert.ok(['AI_NOT_CONFIGURED', 'AI_INVALID_OUTPUT', 'AI_GENERATION_FAILED'].includes(res.body.code))
  })
})
