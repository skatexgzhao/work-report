const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-phase3'
process.env.DB_PATH = path.join(__dirname, 'test-phase3.db')

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

describe('V1 daily reports', () => {
  let db
  let employee
  let manager

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
    employee = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`)
    manager = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'manager'`)
  })

  it('creates a daily report draft', async () => {
    const res = await request(app)
      .post('/api/v1/daily-reports')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
      .send({
        reportDate: '2026-09-01',
        content: { completed: '完成需求评审', plan: '开发接口', risk: '' }
      })

    assert.equal(res.status, 201)
    assert.equal(res.body.status, 'DRAFT')
    assert.equal(res.body.report_date, '2026-09-01')
    assert.equal(res.body.content_json.completed, '完成需求评审')
  })

  it('rejects duplicate report date (409)', async () => {
    const res = await request(app)
      .post('/api/v1/daily-reports')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
      .send({
        reportDate: '2026-09-01',
        content: { completed: '重复', plan: '', risk: '' }
      })

    assert.equal(res.status, 409)
    assert.equal(res.body.code, 'REPORT_EXISTS')
  })

  it('returns daily template with writing hints', async () => {
    const res = await request(app)
      .get('/api/v1/daily-reports/template')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)

    assert.equal(res.status, 200)
    const completed = res.body.formSchema.fields.find((f) => f.key === 'completed')
    assert.ok(completed)
    assert.equal(completed.label, '今日工作')
    assert.ok(completed.hint)
    assert.ok(completed.placeholder)
  })

  it('lists own daily reports', async () => {
    const res = await request(app)
      .get('/api/v1/daily-reports')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)

    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.items))
    assert.ok(res.body.items.some((row) => row.report_date === '2026-09-01'))
    assert.equal(typeof res.body.total, 'number')
  })

  it('updates own draft', async () => {
    const existing = await get(db, 'SELECT id FROM daily_reports WHERE user_id = ? AND report_date = ?', [employee.id, '2026-09-01'])
    const res = await request(app)
      .put(`/api/v1/daily-reports/${existing.id}`)
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
      .send({ content: { completed: '更新后的内容', plan: '明日联调', risk: '' } })

    assert.equal(res.status, 200)
    assert.equal(res.body.content_json.completed, '更新后的内容')
  })

  it('employee cannot update manager draft (403)', async () => {
    const createRes = await request(app)
      .post('/api/v1/daily-reports')
      .set('Authorization', `Bearer ${token({ userId: manager.id, username: 'manager', role: 'manager', departmentId: manager.department_id })}`)
      .send({
        reportDate: '2026-09-02',
        content: { completed: '经理日报', plan: '', risk: '' }
      })
    assert.equal(createRes.status, 201)

    const res = await request(app)
      .put(`/api/v1/daily-reports/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
      .send({ content: { completed: '越权修改', plan: '', risk: '' } })

    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'FORBIDDEN')
  })

  it('submits draft, locks editing, then allows revise', async () => {
    const existing = await get(db, 'SELECT id FROM daily_reports WHERE user_id = ? AND report_date = ?', [employee.id, '2026-09-01'])
    const auth = `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`

    const submitRes = await request(app)
      .post(`/api/v1/daily-reports/${existing.id}/submit`)
      .set('Authorization', auth)

    assert.equal(submitRes.status, 200)
    assert.equal(submitRes.body.status, 'SUBMITTED')

    const updateRes = await request(app)
      .put(`/api/v1/daily-reports/${existing.id}`)
      .set('Authorization', auth)
      .send({ content: { completed: '提交后修改', plan: '', risk: '' } })

    assert.equal(updateRes.status, 409)
    assert.equal(updateRes.body.code, 'REPORT_LOCKED')

    const reviseRes = await request(app)
      .post(`/api/v1/daily-reports/${existing.id}/revise`)
      .set('Authorization', auth)

    assert.equal(reviseRes.status, 200)
    assert.equal(reviseRes.body.status, 'REVISING')

    const editRes = await request(app)
      .put(`/api/v1/daily-reports/${existing.id}`)
      .set('Authorization', auth)
      .send({ content: { completed: '修改后内容', plan: '继续', risk: '' } })

    assert.equal(editRes.status, 200)
    assert.equal(editRes.body.content_json.completed, '修改后内容')
  })
})
