const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')

process.env.JWT_SECRET = 'test-secret-chain'
process.env.DB_PATH = path.join(__dirname, 'test-phase-chain.db')

if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH)
}

const { closeDb } = require('../lib/db')
const { bootstrapDatabase } = require('../bootstrap')
const { app } = require('../server')
const { get, run, all } = require('../lib/dbUtil')

function token(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
}

describe('V1 period report chain', () => {
  let db
  let employee
  let manager
  let dept
  let templateVersion

  before(async () => {
    await closeDb().catch(() => {})
    db = await bootstrapDatabase()
    employee = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'employee'`)
    manager = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'manager'`)
    dept = await get(db, 'SELECT id FROM departments WHERE name = ?', ['技术部'])
    templateVersion = await get(db, 'SELECT id FROM template_versions LIMIT 1')

    for (const date of ['2026-09-07', '2026-09-08', '2026-09-09']) {
      await run(
        db,
        `INSERT INTO daily_reports (user_id, department_id, template_version_id, report_date, content_json, status)
         VALUES (?, ?, ?, ?, ?, 'SUBMITTED')`,
        [employee.id, dept.id, templateVersion.id, date, JSON.stringify({ completed: `done ${date}` })]
      )
    }
  })

  it('daily -> personal weekly -> draft -> submit -> version chain', async () => {
    const employeeToken = token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })

    const createRes = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ reportType: 'PERSONAL_WEEKLY', anchorDate: '2026-09-09' })
    assert.equal(createRes.status, 201)
    const reportId = createRes.body.id

    const sourceRes = await request(app)
      .get(`/api/v1/period-reports/${reportId}/source-data`)
      .set('Authorization', `Bearer ${employeeToken}`)
    assert.equal(sourceRes.status, 200)
    assert.equal(sourceRes.body.dailyCount, 3)

    const draftContent = {
      summary: '本周完成核心开发',
      completed: ['需求评审', '接口开发'],
      key_results: ['日报系统上线'],
      problems: [],
      next_plan: ['联调测试'],
      risks: []
    }

    const saveRes = await request(app)
      .put(`/api/v1/period-reports/${reportId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ content: draftContent })
    assert.equal(saveRes.status, 200)
    assert.equal(saveRes.body.version.version_type, 'DRAFT')

    const submitRes = await request(app)
      .post(`/api/v1/period-reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
    assert.equal(submitRes.status, 200)
    assert.equal(submitRes.body.report.status, 'SUBMITTED')

    const detailRes = await request(app)
      .get(`/api/v1/period-reports/${reportId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
    assert.equal(detailRes.status, 200)
    assert.ok(detailRes.body.versions.length >= 2)
    assert.equal(detailRes.body.versions.at(-1).version_type, 'SUBMITTED')
  })

  it('team weekly source-data lists every selected member personal weekly status', async () => {
    const managerToken = token({ userId: manager.id, username: 'manager', role: 'manager', departmentId: manager.department_id })
    const team = await get(db, 'SELECT id FROM teams WHERE department_id = ? LIMIT 1', [dept.id])
    assert.ok(team)

    const createRes = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reportType: 'TEAM_WEEKLY', teamId: team.id, anchorDate: '2026-09-16' })
    assert.equal(createRes.status, 201)
    const teamReportId = createRes.body.id

    const memberIds = await all(
      db,
      `SELECT u.id FROM users u
       JOIN user_teams ut ON ut.user_id = u.id
       WHERE ut.team_id = ? ORDER BY u.username`,
      [team.id]
    )
    assert.ok(memberIds.length >= 2)

    await request(app)
      .put(`/api/v1/period-reports/${teamReportId}/source-config`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        sourceTypes: ['PERSONAL_WEEKLY'],
        includeAllMembers: false,
        referenceUserIds: memberIds.map((row) => row.id)
      })

    const sourceRes = await request(app)
      .get(`/api/v1/period-reports/${teamReportId}/source-data`)
      .set('Authorization', `Bearer ${managerToken}`)
    assert.equal(sourceRes.status, 200)
    assert.equal(sourceRes.body.isTeamReport, true)
    assert.equal(sourceRes.body.memberCount, memberIds.length)
    const personalItems = sourceRes.body.items.filter((item) => item.sourceType === 'PERSONAL_WEEKLY')
    assert.ok(personalItems.every((item) => item.status === 'SUBMITTED'))
    assert.equal(
      sourceRes.body.submittedCount + sourceRes.body.missingMembers.length,
      memberIds.length
    )
  })

  it('manager creates department weekly from submitted team weekly reports', async () => {
    const managerToken = token({ userId: manager.id, username: 'manager', role: 'manager', departmentId: manager.department_id })
    const employeeToken = token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })

    const team = await get(db, 'SELECT id FROM teams WHERE department_id = ? LIMIT 1', [dept.id])
    assert.ok(team)

    const teamWeeklyRes = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reportType: 'TEAM_WEEKLY', teamId: team.id, anchorDate: '2026-09-09' })
    assert.equal(teamWeeklyRes.status, 201)
    const teamReportId = teamWeeklyRes.body.id

    await request(app)
      .put(`/api/v1/period-reports/${teamReportId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        content: {
          summary: '小组周报',
          completed: ['组内联调'],
          key_results: [],
          problems: [],
          next_plan: [],
          risks: []
        }
      })
    await request(app)
      .post(`/api/v1/period-reports/${teamReportId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)

    const createRes = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reportType: 'DEPARTMENT_WEEKLY', anchorDate: '2026-09-09' })
    assert.equal(createRes.status, 201)
    const deptReportId = createRes.body.id
    assert.equal(createRes.body.user_id, null)
    assert.deepEqual(createRes.body.source_config.sourceTypes, ['TEAM_WEEKLY'])

    const sourceRes = await request(app)
      .get(`/api/v1/period-reports/${deptReportId}/source-data`)
      .set('Authorization', `Bearer ${managerToken}`)
    assert.equal(sourceRes.status, 200)
    assert.ok(sourceRes.body.itemCount >= 1)
    assert.ok(sourceRes.body.items.some((item) => item.sourceType === 'TEAM_WEEKLY'))

    const statusRes = await request(app)
      .get(`/api/v1/period-reports/${deptReportId}/member-status`)
      .set('Authorization', `Bearer ${managerToken}`)
    assert.equal(statusRes.status, 200)
    assert.equal(statusRes.body.scopeMode, 'team')
    assert.ok(statusRes.body.rows.some((row) => row.teamName && row.reportStatus === 'SUBMITTED'))

    const forbiddenRes = await request(app)
      .get(`/api/v1/period-reports/${deptReportId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
    assert.equal(forbiddenRes.status, 403)
  })

  it('manager cannot create department report for another department (403)', async () => {
    await run(db, `INSERT OR IGNORE INTO departments (name, status) VALUES ('产品部', 'ACTIVE')`)
    const otherDept = await get(db, 'SELECT id FROM departments WHERE name = ?', ['产品部'])
    const managerToken = token({ userId: manager.id, username: 'manager', role: 'manager', departmentId: manager.department_id })

    const res = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reportType: 'DEPARTMENT_WEEKLY', anchorDate: '2026-09-09', departmentId: otherDept.id })

    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'FORBIDDEN')
  })

  it('personal monthly source-data includes submitted weeklies in that month', async () => {
    const employeeToken = token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })

    const monthlyRes = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ reportType: 'PERSONAL_MONTHLY', anchorDate: '2026-09-15' })
    assert.equal(monthlyRes.status, 201)
    const monthlyId = monthlyRes.body.id

    const sourceRes = await request(app)
      .get(`/api/v1/period-reports/${monthlyId}/source-data`)
      .set('Authorization', `Bearer ${employeeToken}`)
    assert.equal(sourceRes.status, 200)
    assert.deepEqual(sourceRes.body.sourceTypes, ['PERSONAL_WEEKLY'])
    const weeklies = sourceRes.body.items.filter((i) => i.sourceType === 'PERSONAL_WEEKLY')
    assert.ok(weeklies.length >= 1, 'expected at least one personal weekly in September')
    assert.ok(weeklies.some((i) => i.status === 'SUBMITTED'))
  })

  it('supports PERSONAL_MONTHLY creation', async () => {
    const employeeToken = token({ userId: employee.id, username: 'employee', role: 'employee', departmentId: employee.department_id })
    const res = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ reportType: 'PERSONAL_MONTHLY', anchorDate: '2026-10-15' })
    assert.equal(res.status, 201)
    assert.equal(res.body.start_date, '2026-10-01')
    assert.equal(res.body.end_date, '2026-10-31')
  })

  it('team quarterly draft save persists period_v2 sections', async () => {
    const admin = await get(db, `SELECT u.id, ud.department_id FROM users u
      LEFT JOIN user_departments ud ON ud.user_id = u.id WHERE u.username = 'admin'`)
    const team = await get(db, 'SELECT id FROM teams WHERE department_id = ? LIMIT 1', [dept.id])
    assert.ok(team)
    const adminToken = token({ userId: admin.id, username: 'admin', role: 'admin', departmentId: admin.department_id })

    const createRes = await request(app)
      .post('/api/v1/period-reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reportType: 'TEAM_QUARTERLY', teamId: team.id, anchorDate: '2026-09-15' })
    assert.equal(createRes.status, 201)
    const reportId = createRes.body.id
    assert.equal(createRes.body.content_format, 'period_v2')

    const body = {
      content_format: 'period_v2',
      sections: {
        achievements: '本季小组重点：授权中心升级完成',
        issues: '',
        next_focus: '下季继续稳定性治理'
      },
      achievements: [],
      issues: [],
      next_focus: []
    }

    const saveRes = await request(app)
      .put(`/api/v1/period-reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: body })
    assert.equal(saveRes.status, 200)
    assert.equal(saveRes.body.version.content_json.sections.achievements, body.sections.achievements)

    const detailRes = await request(app)
      .get(`/api/v1/period-reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(detailRes.status, 200)
    assert.equal(
      detailRes.body.currentVersion.content_json.sections.achievements,
      body.sections.achievements
    )
  })
})
