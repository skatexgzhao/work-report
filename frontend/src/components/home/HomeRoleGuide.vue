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

          <h4 class="panel-title">登录与使用流程</h4>
          <el-steps :active="4" align-center finish-status="success" class="flow-steps flow-steps-four">
            <el-step title="注册账号" description="选部门与所属小组" />
            <el-step title="登录系统" description="注册成功后登录" />
            <el-step title="写日报" description="菜单：我的日报" />
            <el-step title="周/月/季并提交" description="我的周/月/季报，保存或 AI 后提交" />
          </el-steps>

          <p class="tip">
            注册时先选部门，再选小组（负责人需事先在「小组管理」创建小组）。
            若部门尚无小组，可先注册，之后由负责人将你加入小组。
            编辑周期报告时，左侧可查看素材与缺失日期；提交前系统会先保存当前内容。
          </p>

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

          <h4 class="panel-title">登录与使用流程</h4>
          <el-steps :active="4" align-center finish-status="success" class="flow-steps flow-steps-four">
            <el-step title="登录" description="使用管理员分配或已有账号" />
            <el-step title="创建小组" description="小组管理：新建供成员注册选择" />
            <el-step title="写个人报告" description="自己的日报与周/月/季报" />
            <el-step title="汇总并提交" description="新建小组/部门报告后编辑提交" />
          </el-steps>

          <p class="tip">
            请先在「小组管理」创建小组，成员注册时会自选小组，一般无需再逐个添加。
            若有人注册时部门尚无小组，可在小组管理里将其补加入组。
            组员个人周期报告提交后，汇总时可引用其素材；您自己的日报与个人周期报告流程与普通使用者相同。
          </p>

          <div class="actions">
            <el-button type="primary" @click="go('/app/admin/teams')">小组管理</el-button>
            <el-button type="primary" plain @click="go('/app/team')">小组报告</el-button>
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

.flow-steps-four :deep(.el-step__title) {
  font-size: 13px;
}

@media (max-width: 640px) {
  .flow-steps :deep(.el-step__description) {
    font-size: 11px;
  }

  .flow-steps-four :deep(.el-step__title) {
    font-size: 12px;
  }
}
</style>
