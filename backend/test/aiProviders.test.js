const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  getProviderPreset,
  supportsJsonResponse,
  resolveApiKeyFromEnv,
  listProviderPresetsForApi
} = require('../lib/aiProviders')

describe('aiProviders', () => {
  it('includes qwen kimi glm presets', () => {
    assert.ok(getProviderPreset('qwen')?.baseUrl.includes('dashscope'))
    assert.ok(getProviderPreset('kimi')?.baseUrl.includes('moonshot'))
    assert.ok(getProviderPreset('glm')?.baseUrl.includes('bigmodel'))
  })

  it('lists presets for admin API', () => {
    const list = listProviderPresetsForApi()
    assert.ok(list.some((p) => p.id === 'qwen'))
    assert.ok(list.some((p) => p.id === 'kimi'))
    assert.ok(list.some((p) => p.id === 'glm'))
  })

  it('supports json mode for major cloud providers', () => {
    assert.equal(supportsJsonResponse('deepseek'), true)
    assert.equal(supportsJsonResponse('qwen'), true)
    assert.equal(supportsJsonResponse('kimi'), true)
    assert.equal(supportsJsonResponse('glm'), true)
    assert.equal(supportsJsonResponse('ollama'), false)
  })

  it('resolveApiKeyFromEnv prefers provider env', () => {
    const prev = process.env.QWEN_API_KEY
    process.env.QWEN_API_KEY = 'test-qwen-key'
    try {
      assert.equal(resolveApiKeyFromEnv('qwen'), 'test-qwen-key')
    } finally {
      if (prev === undefined) delete process.env.QWEN_API_KEY
      else process.env.QWEN_API_KEY = prev
    }
  })
})
