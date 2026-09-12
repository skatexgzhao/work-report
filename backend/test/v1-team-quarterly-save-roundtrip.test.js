const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-tq-save'
process.env.DB_PATH = path.join(__dirname, 'test-team-quarterly-save.db')

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

describe('V1 team quarterly save roundtrip', () => {
  let db
  let admin
  let teamId

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
    admin = await get(
      db,
      `SELECT u.id, ud.department_id FROM users u
       LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'admin'`
    )
    const team = await get(db, 'SELECT id FROM teams LIMIT 1')
    teamId = team.id
  })

  it('PUT draft persists sections and GET returns same text after simulated refresh', async () => {
    const adminToken = token({
      userId: admin.id,
      username: 'admin',
      role: 'admin',
      departmentId: admin.department_id
    })

    const createRes = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reportType: 'TEAM_QUARTERLY', teamId, anchorDate: '2026-08-15' })
    assert.equal(createRes.status, 201)
    const reportId = createRes.body.id

    const bodyText = '小组季报保存验收-' + Date.now()
    const payload = {
      content_format: 'period_v2',
      sections: {
        achievements: bodyText,
        issues: '问题章节',
        next_focus: '下步计划'
      },
      achievements: [],
      issues: [],
      next_focus: []
    }

    const saveRes = await request(app)
      .put(`/api/v1/period-reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: payload })
    assert.equal(saveRes.status, 200, saveRes.body?.message || 'save failed')
    assert.equal(saveRes.body.version.content_json.sections.achievements, bodyText)

    const getRes = await request(app)
      .get(`/api/v1/period-reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(getRes.status, 200)
    assert.ok(getRes.body.currentVersion, 'expected currentVersion on GET')
    assert.equal(getRes.body.currentVersion.content_json.sections.achievements, bodyText)

    const row = await get(
      db,
      `SELECT prv.content_json FROM period_reports pr
       JOIN period_report_versions prv ON prv.id = pr.current_version_id
       WHERE pr.id = ?`,
      [reportId]
    )
    const stored = JSON.parse(row.content_json)
    assert.equal(stored.sections.achievements, bodyText)
  })
})
