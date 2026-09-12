const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-achievements'
process.env.DB_PATH = path.join(__dirname, 'test-achievements-required.db')

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

describe('V1 period report achievements required', () => {
  let db
  let employee
  let reportId

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
    employee = await get(
      db,
      `SELECT u.id, ud.department_id FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`
    )

    const createRes = await request(app)
      .post('/api/v1/period-reports')
      .set(
        'Authorization',
        `Bearer ${token({
          userId: employee.id,
          username: 'employee',
          role: 'employee',
          departmentId: employee.department_id
        })}`
      )
      .send({ reportType: 'PERSONAL_WEEKLY', anchorDate: '2026-09-09' })
    reportId = createRes.body.id
  })

  it('rejects draft save when only issues section is filled', async () => {
    const res = await request(app)
      .put(`/api/v1/period-reports/${reportId}`)
      .set(
        'Authorization',
        `Bearer ${token({
          userId: employee.id,
          username: 'employee',
          role: 'employee',
          departmentId: employee.department_id
        })}`
      )
      .send({
        content: {
          content_format: 'period_v2',
          sections: { achievements: '', issues: '只有问题章', next_focus: '' }
        }
      })
    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'VALIDATION_ERROR')
    assert.match(res.body.message, /重要成果/)
  })

  it('allows save and submit when achievements is filled', async () => {
    const auth = `Bearer ${token({
      userId: employee.id,
      username: 'employee',
      role: 'employee',
      departmentId: employee.department_id
    })}`

    const saveRes = await request(app)
      .put(`/api/v1/period-reports/${reportId}`)
      .send({
        content: {
          content_format: 'period_v2',
          sections: { achievements: '完成核心功能交付', issues: '', next_focus: '' }
        }
      })
      .set('Authorization', auth)
    assert.equal(saveRes.status, 200)

    const submitRes = await request(app)
      .post(`/api/v1/period-reports/${reportId}/submit`)
      .set('Authorization', auth)
    assert.equal(submitRes.status, 200)
    assert.equal(submitRes.body.report.status, 'SUBMITTED')
  })
})
