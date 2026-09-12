<template>
  <div class="daily-principles" :class="variant">
    <h4 v-if="variant === 'panel'" class="principles-panel-title">填写原则</h4>
    <p class="principles-lead">{{ headline }}</p>
    <ul class="principles-list">
      <li v-for="(item, index) in principles" :key="index">
        <span class="principles-index">{{ index + 1 }}</span>
        <div class="principles-text">
          <strong>{{ item.title }}</strong>
          <span>{{ item.body }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  headline: { type: String, required: true },
  principles: { type: Array, required: true },
  /** strip = 顶部横条（窄屏）；panel = 右侧固定卡片（宽屏） */
  variant: { type: String, default: 'strip' }
})
</script>

<style scoped>
.daily-principles {
  color: var(--el-text-color-primary);
}

.principles-lead {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.principles-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.principles-list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.principles-list li + li {
  margin-top: 10px;
}

.principles-index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  text-align: center;
}

.principles-text {
  font-size: 13px;
  line-height: 1.55;
  color: var(--el-text-color-regular);
}

.principles-text strong {
  color: var(--el-text-color-primary);
  margin-right: 6px;
}

/* 窄屏：顶部条 */
.daily-principles.strip {
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.daily-principles.strip .principles-list li + li {
  margin-top: 8px;
}

/* 宽屏：右侧卡片 */
.daily-principles.panel {
  padding: 14px 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  box-shadow: var(--el-box-shadow-lighter);
}

.principles-panel-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.daily-principles.panel .principles-lead {
  font-size: 13px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 12px;
}

.daily-principles.panel .principles-text {
  font-size: 13px;
}
</style>
