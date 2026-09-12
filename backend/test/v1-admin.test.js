const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-admin'
process.env.DB_PATH = path.join(__dirname, 'test-phase-admin.db')

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

describe('V1 admin APIs', () => {
  let admin
  let employee

  before(async () => {
    await closeDb().catch(() => {})
    await bootstrapDatabase()
    admin = await get(require('../lib/db').getDb(), `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'admin'`)
    employee = await get(require('../lib/db').getDb(), `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`)
  })

  it('admin can list templates', async () => {
    const res = await request(app)
      .get('/api/v1/templates')
      .set('Authorization', `Bearer ${token({ userId: admin.id, username: 'admin', role: 'admin', departmentId: admin.department_id })}`)
    assert.equal(res.status, 200)
    assert.ok(res.body.some((t) => t.type === 'DEPARTMENT_WEEKLY'))
  })

  it('employee cannot list templates (403)', async () => {
    const res = await request(app)
      .get('/api/v1/templates')
      .set('Authorization', `Bearer ${token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })}`)
    assert.equal(res.status, 403)
  })

  it('admin can update ai config with masked key', async () => {
    const res = await request(app)
      .put('/api/v1/ai-config')
      .set('Authorization', `Bearer ${token({ userId: admin.id, username: 'admin', role: 'admin', departmentId: admin.department_id })}`)
      .send({
        provider: 'openai-compatible',
        base_url: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        apiKey: 'sk-test-key-1234',
        enabled: true
      })
    assert.equal(res.status, 200)
    assert.equal(res.body.apiKeyMasked, '****1234')
    assert.equal(res.body.provider, 'openai-compatible')
  })
})
