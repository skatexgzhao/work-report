const { AppError } = require('../lib/errors')
const { get, all, run } = require('../lib/dbUtil')

function parseJson(value, fallback = null) {
  if (!value) return fallback
  return typeof value === 'string' ? JSON.parse(value) : value
}

async function listTemplates(db) {
  const rows = await all(
    db,
    `SELECT t.id, t.name, t.type, t.scope, t.status, t.current_version_id, t.created_at, t.updated_at,
            tv.version AS current_version
     FROM templates t
     LEFT JOIN template_versions tv ON tv.id = t.current_version_id
     ORDER BY t.type`
  )
  return rows
}

async function getTemplate(db, id) {
  const template = await get(
    db,
    `SELECT t.id, t.name, t.type, t.scope, t.status, t.current_version_id, t.created_at, t.updated_at
     FROM templates t WHERE t.id = ?`,
    [id]
  )
  if (!template) {
    throw new AppError('TEMPLATE_NOT_FOUND', '模板不存在', 404)
  }
  const versions = await all(
    db,
    `SELECT id, template_id, version, form_schema, prompt_template, output_schema, created_at
     FROM template_versions WHERE template_id = ? ORDER BY version DESC`,
    [id]
  )
  return {
    ...template,
    versions: versions.map((v) => ({
      ...v,
      form_schema: parseJson(v.form_schema, {}),
      output_schema: parseJson(v.output_schema, {})
    }))
  }
}

async function createTemplate(db, user, { name, type, scope = 'SYSTEM', status = 'ACTIVE' }) {
  if (!name || !type) {
    throw new AppError('VALIDATION_ERROR', 'name 和 type 不能为空', 400)
  }
  const result = await run(
    db,
    `INSERT INTO templates (name, type, scope, status, created_by) VALUES (?, ?, ?, ?, ?)`,
    [name, type, scope, status, user.userId]
  )
  return getTemplate(db, result.lastID)
}

async function updateTemplate(db, id, { name, status }) {
  const existing = await get(db, 'SELECT id FROM templates WHERE id = ?', [id])
  if (!existing) {
    throw new AppError('TEMPLATE_NOT_FOUND', '模板不存在', 404)
  }
  if (name != null) {
    await run(db, 'UPDATE templates SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, id])
  }
  if (status != null) {
    await run(db, 'UPDATE templates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id])
  }
  return getTemplate(db, id)
}

async function createTemplateVersion(db, user, templateId, { formSchema, promptTemplate, outputSchema }) {
  const template = await get(db, 'SELECT id FROM templates WHERE id = ?', [templateId])
  if (!template) {
    throw new AppError('TEMPLATE_NOT_FOUND', '模板不存在', 404)
  }
  const latest = await get(db, 'SELECT MAX(version) AS maxVersion FROM template_versions WHERE template_id = ?', [templateId])
  const nextVersion = (latest?.maxVersion || 0) + 1

  const result = await run(
    db,
    `INSERT INTO template_versions (template_id, version, form_schema, prompt_template, output_schema, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      templateId,
      nextVersion,
      JSON.stringify(formSchema || {}),
      promptTemplate || '',
      JSON.stringify(outputSchema || {}),
      user.userId
    ]
  )

  await run(db, 'UPDATE templates SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [result.lastID, templateId])
  return getTemplate(db, templateId)
}

module.exports = { listTemplates, getTemplate, createTemplate, updateTemplate, createTemplateVersion }
