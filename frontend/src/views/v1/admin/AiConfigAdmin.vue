<template>
  <div>
    <h3>智能写作配置</h3>
    <p class="page-hint">用于自动生成周报/月报内容。支持 DeepSeek、通义千问、Kimi、智谱 GLM 等 OpenAI 兼容接口。</p>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-alert v-else-if="error" type="error" :title="error" show-icon />

    <el-form v-else label-width="140px" style="max-width: 640px">
      <el-form-item label="服务类型">
        <el-select v-model="form.provider" @change="onProviderChange">
          <el-option v-for="opt in providerOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="接口地址">
        <el-input v-model="form.base_url" placeholder="OpenAI 兼容 base URL，需含 /v1 或厂商文档路径" />
      </el-form-item>
      <el-form-item label="模型名称">
        <el-input v-model="form.model" placeholder="如 deepseek-chat、qwen-plus、moonshot-v1-8k、glm-4-flash" />
      </el-form-item>
      <el-form-item label="访问密钥">
        <el-input v-model="form.apiKey" type="password" :placeholder="keyHint" />
        <div v-if="form.apiKeyMasked" class="hint">当前密钥：{{ form.apiKeyMasked }}</div>
        <div class="hint">{{ keyHint }}</div>
      </el-form-item>
      <el-form-item label="超时时间（毫秒）">
        <el-input-number v-model="form.timeout_ms" :min="1000" :step="1000" />
      </el-form-item>
      <el-form-item label="创造性程度">
        <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" />
        <div class="hint">数值越低，生成内容越稳定；越高，表达越灵活。</div>
      </el-form-item>
      <el-form-item label="最大输出长度">
        <el-input-number v-model="form.max_tokens" :min="256" :step="256" />
      </el-form-item>
      <el-form-item label="是否启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
    </el-form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import v1Client from '../../../api/v1/client'
import {
  PROVIDER_OPTIONS,
  applyProviderPreset,
  keyHintForProvider
} from '../../../utils/aiProviderPresets'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const providerOptions = ref(PROVIDER_OPTIONS)
const form = ref({
  provider: 'deepseek',
  base_url: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: '',
  apiKeyMasked: null,
  timeout_ms: 60000,
  temperature: 0.3,
  max_tokens: 4000,
  enabled: false
})

const keyHint = computed(() => keyHintForProvider(form.value.provider))

function onProviderChange(provider) {
  applyProviderPreset(form.value, provider)
}

async function loadConfig() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await v1Client.get('/ai-config')
    if (Array.isArray(data.providerPresets) && data.providerPresets.length) {
      providerOptions.value = data.providerPresets.map((p) => ({
        value: p.id,
        label: p.label
      }))
    }
    const { providerPresets, ...config } = data
    void providerPresets
    form.value = { ...form.value, ...config, apiKey: '' }
  } catch (err) {
    error.value = err.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.apiKey) delete payload.apiKey
    delete payload.apiKeyMasked
    const { data } = await v1Client.put('/ai-config', payload)
    const { providerPresets, ...config } = data
    void providerPresets
    form.value = { ...form.value, ...config, apiKey: '' }
    ElMessage.success('配置已保存')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadConfig)
</script>

<style scoped>
.page-hint {
  color: #909399;
  margin: 0 0 16px;
}

.hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
