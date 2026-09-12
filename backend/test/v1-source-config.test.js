const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-source-config'
process.env.DB_PATH = path.join(__dirname, 'test-source-config.db')

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

describe('V1 source config', () => {
  let db
  let employee
  let manager
  let reportId

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
    employee = await get(
      db,
      `SELECT u.id, ud.department_id FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`
    )
    manager = await get(
      db,
      `SELECT u.id, ud.department_id FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'manager'`
    )

    const createRes = await request(app)
      .post('/api/v1/period-reports')
      .set(
        'Authorization',
        `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`
      )
      .send({ reportType: 'PERSONAL_MONTHLY' })

    reportId = createRes.body.id
  })

  it('returns source options with layered defaults', async () => {
    const res = await request(app)
      .get('/api/v1/period-reports/source-options')
      .query({ reportType: 'PERSONAL_MONTHLY' })
      .set(
        'Authorization',
        `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`
      )

    assert.equal(res.status, 200)
    assert.deepEqual(res.body.defaultSourceTypes, ['PERSONAL_WEEKLY'])
    assert.deepEqual(res.body.allowedSourceTypes, ['PERSONAL_WEEKLY', 'DAILY'])
  })

  it('creates monthly report with default weekly source only', async () => {
    const res = await request(app)
      .get(`/api/v1/period-reports/${reportId}`)
      .set(
        'Authorization',
        `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`
      )

    assert.deepEqual(res.body.source_config.sourceTypes, ['PERSONAL_WEEKLY'])
  })

  it('updates source config on draft report', async () => {
    const res = await request(app)
      .put(`/api/v1/period-reports/${reportId}/source-config`)
      .set(
        'Authorization',
        `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`
      )
      .send({ sourceConfig: { sourceTypes: ['PERSONAL_WEEKLY'], includeAllMembers: true } })

    assert.equal(res.status, 200)
    assert.deepEqual(res.body.report.source_config.sourceTypes, ['PERSONAL_WEEKLY'])
    assert.ok(res.body.meta.sourceItemCount >= 0)
  })

  it('lists team reports when teamId is provided', async () => {
    const team = await get(db, 'SELECT id FROM teams WHERE department_id = ? LIMIT 1', [employee.department_id])
    const res = await request(app)
      .get('/api/v1/period-reports')
      .query({ scope: 'team', teamId: team.id })
      .set(
        'Authorization',
        `Bearer ${token({ userId: manager.id, username: 'manager', role: 'manager', departmentId: manager.department_id })}`
      )

    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.items))
  })

  it('returns team default personal weekly sources for team weekly', async () => {
    const res = await request(app)
      .get('/api/v1/period-reports/source-options')
      .query({ reportType: 'TEAM_WEEKLY' })
      .set(
        'Authorization',
        `Bearer ${token({ userId: manager.id, username: 'manager', role: 'manager', departmentId: manager.department_id })}`
      )

    assert.deepEqual(res.body.defaultSourceTypes, ['PERSONAL_WEEKLY'])
    assert.deepEqual(res.body.memberSourceTypes, ['PERSONAL_WEEKLY', 'DAILY'])
  })

  it('returns department default team weekly sources', async () => {
    const res = await request(app)
      .get('/api/v1/period-reports/source-options')
      .query({ reportType: 'DEPARTMENT_WEEKLY' })
      .set(
        'Authorization',
        `Bearer ${token({ userId: manager.id, username: 'manager', role: 'manager', departmentId: manager.department_id })}`
      )

    assert.deepEqual(res.body.defaultSourceTypes, ['TEAM_WEEKLY'])
  })
})
