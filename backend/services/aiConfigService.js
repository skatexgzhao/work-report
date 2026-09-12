const { AppError } = require('../lib/errors')
const { get, run } = require('../lib/dbUtil')
const { getProviderPreset, listProviderPresetsForApi } = require('../lib/aiProviders')

function encodeApiKey(apiKey) {
  if (!apiKey) return null
  return Buffer.from(apiKey, 'utf8').toString('base64')
}

function decodeApiKey(stored) {
  if (!stored) return null
  try {
    return Buffer.from(stored, 'base64').toString('utf8')
  } catch {
    return stored
  }
}

function maskApiKey(stored) {
  const plain = decodeApiKey(stored)
  if (!plain) return null
  if (plain.length <= 4) return '****'
  return `****${plain.slice(-4)}`
}

async function getConfig(db) {
  const row = await get(db, 'SELECT * FROM ai_config ORDER BY id DESC LIMIT 1')
  if (!row) {
    return {
      provider: 'deepseek',
      base_url: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      timeout_ms: 60000,
      temperature: 0.3,
      max_tokens: 4000,
      enabled: false,
      apiKeyMasked: null
    }
  }
  return {
    id: row.id,
    provider: row.provider,
    base_url: row.base_url,
    model: row.model,
    timeout_ms: row.timeout_ms,
    temperature: row.temperature,
    max_tokens: row.max_tokens,
    enabled: !!row.enabled,
    apiKeyMasked: maskApiKey(row.api_key_encrypted),
    updated_at: row.updated_at
  }
}

async function updateConfig(db, payload) {
  const existing = await get(db, 'SELECT id FROM ai_config ORDER BY id DESC LIMIT 1')
  const apiKeyEncrypted = payload.apiKey != null
    ? encodeApiKey(payload.apiKey)
    : undefined

  const provider = payload.provider || 'deepseek'
  const preset = getProviderPreset(provider)

  if (!existing) {
    await run(
      db,
      `INSERT INTO ai_config (provider, base_url, api_key_encrypted, model, timeout_ms, temperature, max_tokens, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        provider,
        payload.base_url || preset?.baseUrl || 'https://api.deepseek.com/v1',
        apiKeyEncrypted || encodeApiKey(process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || ''),
        payload.model || preset?.defaultModel || 'deepseek-chat',
        payload.timeout_ms ?? 60000,
        payload.temperature ?? 0.3,
        payload.max_tokens ?? 4000,
        payload.enabled === false ? 0 : 1
      ]
    )
    return getConfig(db)
  }

  const fields = []
  const params = []
  const map = {
    provider: payload.provider,
    base_url: payload.base_url,
    model: payload.model,
    timeout_ms: payload.timeout_ms,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
    enabled: payload.enabled === undefined ? undefined : payload.enabled ? 1 : 0
  }

  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      params.push(value)
    }
  }
  if (apiKeyEncrypted !== undefined) {
    fields.push('api_key_encrypted = ?')
    params.push(apiKeyEncrypted)
  }
  fields.push('updated_at = CURRENT_TIMESTAMP')
  params.push(existing.id)

  if (fields.length > 1) {
    await run(db, `UPDATE ai_config SET ${fields.join(', ')} WHERE id = ?`, params)
  }

  return getConfig(db)
}

module.exports = {
  getConfig,
  updateConfig,
  maskApiKey,
  encodeApiKey,
  decodeApiKey,
  listProviderPresetsForApi
}
