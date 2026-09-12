/** 与 backend/lib/aiProviders.js 保持一致 */

export const AI_PROVIDER_PRESETS = {
  deepseek: {
    label: 'DeepSeek（推荐）',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyHint: 'DeepSeek 开放平台 API Key'
  },
  qwen: {
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    keyHint: '阿里云 DashScope API Key（兼容模式）'
  },
  kimi: {
    label: 'Kimi（Moonshot）',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    keyHint: 'Moonshot 开放平台 API Key'
  },
  glm: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    keyHint: '智谱开放平台 API Key'
  },
  'openai-compatible': {
    label: '兼容 OpenAI 的接口',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyHint: '对应服务的 Bearer Token'
  },
  ollama: {
    label: 'Ollama 本地',
    baseUrl: 'http://127.0.0.1:11434/v1',
    defaultModel: 'llama3.1',
    keyHint: '本地一般可留空或填 ollama'
  }
}

export const PROVIDER_OPTIONS = Object.entries(AI_PROVIDER_PRESETS).map(([value, p]) => ({
  value,
  label: p.label
}))

export function applyProviderPreset(form, provider) {
  const preset = AI_PROVIDER_PRESETS[provider]
  if (!preset) return
  form.base_url = preset.baseUrl
  form.model = preset.defaultModel
}

export function keyHintForProvider(provider) {
  return AI_PROVIDER_PRESETS[provider]?.keyHint || 'API Key'
}
