const axios = require('axios')
const { AppError } = require('../lib/errors')
const { get, run } = require('../lib/dbUtil')
const periodReportRepo = require('../repositories/periodReportRepo')
const periodReportService = require('./periodReportService')
const { render } = require('../lib/promptRenderer')
const {
  isPeriodV2Report,
  validatePeriodV2Output,
  CONTENT_FORMAT_V2,
  enrichPeriodV2AfterAi
} = require('../lib/periodContentV2')
const {
  buildScopeHint,
  buildFocusBlock,
  buildPeriodV2Prompt,
  outputSchemaJsonForProvider
} = require('../lib/periodV2Prompt')

const { decodeApiKey } = require('./aiConfigService')
const { supportsJsonResponse, resolveApiKeyFromEnv } = require('../lib/aiProviders')

function resolveApiKey(config) {
  return decodeApiKey(config?.api_key_encrypted) || resolveApiKeyFromEnv(config?.provider)
}

function buildChatBody(config, prompt, outputSchema) {
  const body = {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    messages: [
      { role: 'system', content: '你是工作汇报助手，只输出 JSON，不要 markdown 代码块。' },
      { role: 'user', content: `${prompt}\n\n请严格输出以下 JSON 结构：${outputSchema}` }
    ]
  }
  if (supportsJsonResponse(config.provider)) {
    body.response_format = { type: 'json_object' }
  }
  return body
}

async function getAiConfig(db) {
  return get(db, 'SELECT * FROM ai_config ORDER BY id DESC LIMIT 1')
}

async function hasRunningExecution(db, reportId) {
  const row = await get(
    db,
    `SELECT id FROM ai_executions WHERE report_id = ? AND status = 'RUNNING' LIMIT 1`,
    [reportId]
  )
  return !!row
}

function truncateInput(text, max = 32000) {
  if (!text || text.length <= max) return { text: text || '', truncated: false }
  return { text: text.slice(0, max), truncated: true }
}

function buildReportData(sourceData) {
  if (!sourceData.items?.length) return ''
  if (sourceData.items[0].username) {
    return sourceData.items
      .map((item) => `${item.username}: ${JSON.stringify(item.contentJson)}`)
      .join('\n')
  }
  return sourceData.items
    .map((item) => `${item.reportDate}: ${JSON.stringify(item.contentJson)}`)
    .join('\n')
}

function validateOutputSchema(report, parsed) {
  if (isPeriodV2Report(report)) {
    const err = validatePeriodV2Output(parsed)
    if (err) {
      throw new AppError('AI_INVALID_OUTPUT', err, 502)
    }
    parsed.content_format = CONTENT_FORMAT_V2
    return
  }
  const requiredKeys = ['summary', 'completed', 'key_results', 'problems', 'next_plan', 'risks']
  if (typeof parsed !== 'object' || parsed == null) {
    throw new AppError('AI_INVALID_OUTPUT', 'AI 输出不是有效 JSON 对象', 502)
  }
  for (const key of requiredKeys) {
    if (!(key in parsed)) {
      throw new AppError('AI_INVALID_OUTPUT', `AI 输出缺少字段: ${key}`, 502)
    }
  }
}

function schemaStringForProvider(report, template) {
  if (isPeriodV2Report(report)) {
    return outputSchemaJsonForProvider()
  }
  const schema = template.output_schema
  return typeof schema === 'string' ? schema : JSON.stringify(schema || {})
}

async function insertExecution(db, payload) {
  const result = await run(
    db,
    `INSERT INTO ai_executions
      (report_id, user_id, model, template_version_id, prompt, input_snapshot, raw_response, parsed_result, status, duration_ms, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.reportId,
      payload.userId,
      payload.model,
      payload.templateVersionId,
      payload.prompt,
      JSON.stringify(payload.inputSnapshot),
      payload.rawResponse || null,
      payload.parsedResult ? JSON.stringify(payload.parsedResult) : null,
      payload.status,
      payload.durationMs || null,
      payload.errorMessage || null
    ]
  )
  return result.lastID
}

async function callProvider(config, prompt, outputSchema) {
  const apiKey = resolveApiKey(config)
  const ollamaLocal = config?.provider === 'ollama'
  if (!config || !config.enabled || (!apiKey && !ollamaLocal)) {
    throw new AppError('AI_NOT_CONFIGURED', 'AI 服务未配置', 503)
  }

  const started = Date.now()
  const url = `${config.base_url.replace(/\/$/, '')}/chat/completions`
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  let response
  try {
    response = await axios.post(url, buildChatBody(config, prompt, outputSchema), {
      headers,
      timeout: config.timeout_ms || 60000
    })
  } catch (err) {
    const status = err.response?.status
    const msg = err.response?.data?.error?.message || err.message
    if (status === 401) {
      throw new AppError('AI_NOT_CONFIGURED', 'API Key 无效或未授权', 503)
    }
    if (status === 400 && String(msg).toLowerCase().includes('response_format')) {
      response = await axios.post(
        url,
        buildChatBody({ ...config, provider: 'openai-compatible' }, prompt, outputSchema),
        { headers, timeout: config.timeout_ms || 60000 }
      )
    } else {
      throw new AppError('AI_GENERATION_FAILED', msg || 'AI 请求失败', 502)
    }
  }

  const raw = response.data?.choices?.[0]?.message?.content || ''
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new AppError('AI_INVALID_OUTPUT', 'AI 输出无法解析为 JSON', 502)
  }

  return { raw, parsed, durationMs: Date.now() - started }
}

async function generateReport(db, user, reportId) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  const { assertCanAccessReport, assertCanEditReport } = require('./periodReportService')
  assertCanEditReport(user, report)

  if (await hasRunningExecution(db, reportId)) {
    throw new AppError('AI_BUSY', '已有 AI 生成任务进行中', 409)
  }

  const config = await getAiConfig(db)
  const template = await periodReportService.getTemplateForType(db, report.report_type)
  const sourceData = await periodReportService.getSourceData(db, user, reportId)
  const reportDataRaw = buildReportData(sourceData)
  if (!reportDataRaw || !String(reportDataRaw).trim()) {
    throw new AppError('SOURCE_DATA_EMPTY', '素材不足，请先补充下级报告或日报后再生成', 400)
  }
  const { text: reportData, truncated } = truncateInput(reportDataRaw)

  const missingDates = (sourceData.missingDates || []).join(', ') || '无'
  let prompt
  if (isPeriodV2Report(report)) {
    const scopeHint = buildScopeHint(report)
    const focusBlock = buildFocusBlock(report.generation_focus)
    const baseRendered = render(template.prompt_template, {
      startDate: report.start_date,
      endDate: report.end_date,
      missingDates,
      reportData,
      focusTopics: report.generation_focus || '',
      scopeHint,
      focusBlock
    })
    prompt = buildPeriodV2Prompt(baseRendered, {
      startDate: report.start_date,
      endDate: report.end_date,
      missingDates,
      reportData,
      scopeHint,
      focusBlock
    })
  } else {
    prompt = render(template.prompt_template, {
      startDate: report.start_date,
      endDate: report.end_date,
      missingDates,
      reportData
    })
  }

  const outputSchemaForProvider = schemaStringForProvider(report, template)
  const inputSnapshot = {
    sourceData,
    truncated,
    generationFocus: report.generation_focus,
    contentFormat: report.content_format,
    promptVars: { startDate: report.start_date, endDate: report.end_date }
  }
  const runningId = await insertExecution(db, {
    reportId,
    userId: user.userId,
    model: config?.model || 'unknown',
    templateVersionId: template.id,
    prompt,
    inputSnapshot,
    status: 'RUNNING'
  })

  let attempt = 0
  let lastError = null
  while (attempt < 2) {
    attempt += 1
    try {
      const result = await callProvider(config, prompt, outputSchemaForProvider)
      validateOutputSchema(report, result.parsed)
      const contentToSave = isPeriodV2Report(report)
        ? enrichPeriodV2AfterAi(result.parsed)
        : result.parsed

      await run(
        db,
        `UPDATE ai_executions SET status = 'SUCCESS', raw_response = ?, parsed_result = ?, duration_ms = ?, error_message = NULL WHERE id = ?`,
        [result.raw, JSON.stringify(result.parsed), result.durationMs, runningId]
      )

      const nextVersion = (await periodReportRepo.getLatestVersionNumber(db, reportId)) + 1
      const version = await periodReportRepo.insertVersion(db, {
        reportId,
        version: nextVersion,
        versionType: 'AI',
        templateVersionId: template.id,
        sourceSnapshot: sourceData,
        contentJson: contentToSave,
        rawContent: result.raw,
        createdBy: user.userId
      })

      return {
        executionId: runningId,
        version: periodReportService.parseJson(version.content_json)
          ? { ...version, content_json: contentToSave }
          : version,
        report: await periodReportService.getReport(db, user, reportId)
      }
    } catch (err) {
      lastError = err
      if (err instanceof AppError && err.code === 'AI_NOT_CONFIGURED') {
        await run(db, `UPDATE ai_executions SET status = 'FAILED', error_message = ? WHERE id = ?`, [err.message, runningId])
        throw err
      }
    }
  }

  const message = lastError?.message || 'AI 生成失败'
  await run(db, `UPDATE ai_executions SET status = 'FAILED', error_message = ? WHERE id = ?`, [message, runningId])
  throw lastError instanceof AppError ? lastError : new AppError('AI_GENERATION_FAILED', message, 502)
}

async function getExecution(db, user, executionId) {
  const row = await get(db, 'SELECT * FROM ai_executions WHERE id = ?', [executionId])
  if (!row) {
    throw new AppError('EXECUTION_NOT_FOUND', 'AI 执行记录不存在', 404)
  }
  if (row.user_id !== user.userId && user.role !== 'admin') {
    throw new AppError('FORBIDDEN', '无权查看该执行记录', 403)
  }
  return {
    ...row,
    input_snapshot: row.input_snapshot ? JSON.parse(row.input_snapshot) : null,
    parsed_result: row.parsed_result ? JSON.parse(row.parsed_result) : null
  }
}

module.exports = { generateReport, getExecution, getAiConfig, callProvider }
