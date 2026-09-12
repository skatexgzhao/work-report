<template>
  <div class="role-guide">
    <el-tabs v-model="activeTab" class="role-tabs">
      <el-tab-pane label="我是普通使用者" name="employee">
        <div class="guide-panel">
          <h4 class="panel-title">我能得到什么</h4>
          <ul class="bullet-list">
            <li>不用反复抄同一件事：周期报告可以引用已提交的日报。</li>
            <li>草稿随时保存，提交前有记录；需要时可请 AI 帮忙起稿。</li>
          </ul>

          <h4 class="panel-title">怎么走</h4>
          <el-steps :active="3" align-center finish-status="success" class="flow-steps">
            <el-step title="写日报" description="菜单：我的日报" />
            <el-step title="做周/月/季" description="菜单：我的周/月/季报" />
            <el-step title="提交" description="保存或 AI 后提交" />
          </el-steps>

          <p class="tip">编辑周期报告时，左侧可查看素材与缺失日期；提交前系统会先保存当前内容。</p>

          <div class="actions">
            <el-button type="primary" @click="go('/app/daily')">去写日报</el-button>
            <el-button @click="go('/app/period')">我的周/月/季报</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我是部门负责人" name="manager">
        <div class="guide-panel">
          <h4 class="panel-title">我能得到什么</h4>
          <ul class="bullet-list">
            <li>查看本小组、本部门在本周期的报告与成员提交情况。</li>
            <li>基于下级已提交报告编写汇总，过程可追溯、有依据。</li>
          </ul>

          <h4 class="panel-title">怎么走</h4>
          <el-steps :active="3" align-center finish-status="success" class="flow-steps">
            <el-step title="打开列表" description="小组或部门报告" />
            <el-step title="新建本周期" description="选时间范围与素材来源" />
            <el-step title="编辑并提交" description="可查看素材与状态" />
          </el-steps>

          <p class="tip">组员个人报告交齐后，汇总更省力；您也可以像普通使用者一样写自己的日报与个人周期报告。</p>

          <div class="actions">
            <el-button type="primary" @click="go('/app/team')">小组报告</el-button>
            <el-button type="primary" plain @click="go('/app/department')">部门报告</el-button>
            <el-button @click="go('/app/period')">我的周/月/季报</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  defaultTab: {
    type: String,
    default: 'employee',
    validator: (v) => ['employee', 'manager'].includes(v)
  }
})

const router = useRouter()
const activeTab = ref(props.defaultTab)

watch(
  () => props.defaultTab,
  (v) => {
    activeTab.value = v
  }
)

function go(path) {
  router.push(path)
}
</script>

<style scoped>
.role-guide {
  width: 100%;
}

.panel-title {
  margin: 0 0 8px;
  font-size: 15px;
  color: #303133;
}

.bullet-list {
  margin: 0 0 20px;
  padding-left: 20px;
  color: #606266;
  line-height: 1.75;
}

.flow-steps {
  margin: 8px 0 20px;
}

.tip {
  margin: 0 0 16px;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .flow-steps :deep(.el-step__description) {
    font-size: 11px;
  }
}
</style>
