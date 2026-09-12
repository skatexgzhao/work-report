const { AppError } = require('../lib/errors')
const { getAiConfig, callProvider } = require('./aiService')
const { PERIOD_V2_OUTPUT_SCHEMA_DOC } = require('../lib/periodContentV2')

const DERIVE_OUTPUT_SHAPE = {
  content_format: 'period_v2',
  output_schema: PERIOD_V2_OUTPUT_SCHEMA_DOC,
  prompt_appendix: '字符串：给 AI 的补充写作要求',
  variable_hints: [
    { name: 'startDate', description: '周期开始日期' },
    { name: 'endDate', description: '周期结束日期' },
    { name: 'reportData', description: '素材 JSON 文本' },
    { name: 'focusTopics', description: '用户关注方向' },
    { name: 'missingDates', description: '缺失日期列表' }
  ]
}

async function deriveFromSample(db, { sampleMarkdown, reportType }) {
  if (!sampleMarkdown || !String(sampleMarkdown).trim()) {
    throw new AppError('VALIDATION_ERROR', '样例内容不能为空', 400)
  }

  const config = await getAiConfig(db)
  const prompt = `你是报告模板设计助手。用户给出一份期望的报告输出样例（Markdown），报告类型：${reportType || '未知'}。

请根据样例结构，推断适合「智能生成」使用的 JSON 输出 schema（优先采用 period_v2：achievements / issues / next_focus 三章结构）。
同时给出 prompt_appendix：告诉 AI 如何按样例风格写作，且必须仅依据素材、不得编造。

用户样例：
---
${String(sampleMarkdown).trim()}
---

请输出 JSON，结构参考：
${JSON.stringify(DERIVE_OUTPUT_SHAPE)}`

  const schemaHint = JSON.stringify(DERIVE_OUTPUT_SHAPE)
  const result = await callProvider(config, prompt, schemaHint)
  const parsed = result.parsed || {}

  if (!parsed.output_schema || typeof parsed.output_schema !== 'object') {
    throw new AppError('AI_INVALID_OUTPUT', '未能从样例推导 output_schema', 502)
  }

  return {
    content_format: parsed.content_format || 'period_v2',
    outputSchema: parsed.output_schema,
    promptAppendix: parsed.prompt_appendix || '',
    variableHints: parsed.variable_hints || DERIVE_OUTPUT_SHAPE.variable_hints,
    raw: result.raw
  }
}

module.exports = { deriveFromSample }
