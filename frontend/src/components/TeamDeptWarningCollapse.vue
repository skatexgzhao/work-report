<template>
  <el-collapse class="team-dept-warning-collapse">
    <el-collapse-item name="tip">
      <template #title>
        <span class="team-dept-warning-collapse__title">小组/部门报告：挑重点汇总（点击展开说明）</span>
      </template>
      <p class="team-dept-warning-collapse__body">
        请从素材中归纳重点，禁止把每人每天的日报流水账原样搬进报告。
      </p>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
.team-dept-warning-collapse {
  margin-bottom: 8px;
  border: none;
}

.team-dept-warning-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 36px;
  line-height: 1.4;
  padding: 4px 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--el-color-warning-dark-2);
}

.team-dept-warning-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.team-dept-warning-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}

.team-dept-warning-collapse__title {
  font-weight: 500;
}

.team-dept-warning-collapse__body {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}
</style>
