/**
 * OpenAI 兼容接口厂商预设（chat/completions）。
 * 管理员可在后台覆盖 base_url / model。
 */

const AI_PROVIDER_PRESETS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    supportsJsonMode: true,
    envKeys: ['DEEPSEEK_API_KEY', 'AI_API_KEY']
  },
  qwen: {
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    supportsJsonMode: true,
    envKeys: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY', 'AI_API_KEY']
  },
  kimi: {
    label: 'Kimi（Moonshot）',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    supportsJsonMode: true,
    envKeys: ['MOONSHOT_API_KEY', 'KIMI_API_KEY', 'AI_API_KEY']
  },
  glm: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    supportsJsonMode: true,
    envKeys: ['ZHIPU_API_KEY', 'GLM_API_KEY', 'AI_API_KEY']
  },
  'openai-compatible': {
    label: '兼容 OpenAI 的接口',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    supportsJsonMode: true,
    envKeys: ['OPENAI_API_KEY', 'AI_API_KEY']
  },
  ollama: {
    label: 'Ollama 本地',
    baseUrl: 'http://127.0.0.1:11434/v1',
    defaultModel: 'llama3.1',
    supportsJsonMode: false,
    envKeys: ['AI_API_KEY']
  }
}

const KNOWN_PROVIDERS = new Set(Object.keys(AI_PROVIDER_PRESETS))

function getProviderPreset(provider) {
  return AI_PROVIDER_PRESETS[provider] || null
}

function supportsJsonResponse(provider) {
  const preset = getProviderPreset(provider)
  if (preset) return preset.supportsJsonMode
  return true
}

function resolveApiKeyFromEnv(provider) {
  if (process.env.AI_API_KEY) return process.env.AI_API_KEY
  const preset = getProviderPreset(provider)
  if (!preset) return process.env.DEEPSEEK_API_KEY || null
  for (const key of preset.envKeys) {
    if (process.env[key]) return process.env[key]
  }
  return null
}

function listProviderPresetsForApi() {
  return Object.entries(AI_PROVIDER_PRESETS).map(([id, p]) => ({
    id,
    label: p.label,
    baseUrl: p.baseUrl,
    defaultModel: p.defaultModel,
    supportsJsonMode: p.supportsJsonMode
  }))
}

module.exports = {
  AI_PROVIDER_PRESETS,
  KNOWN_PROVIDERS,
  getProviderPreset,
  supportsJsonResponse,
  resolveApiKeyFromEnv,
  listProviderPresetsForApi
}
