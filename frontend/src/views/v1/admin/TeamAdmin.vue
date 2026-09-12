<template>
  <div>
    <div class="toolbar">
      <h3>小组管理</h3>
      <el-button type="primary" @click="openCreate">新建小组</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="4" animated />
    <el-alert v-else-if="error" type="error" :title="error" show-icon />
    <el-table v-else :data="teams" stripe>
      <el-table-column prop="name" label="小组名称" />
      <el-table-column prop="leader_username" label="负责人" width="120" />
      <el-table-column prop="member_count" label="成员数" width="100" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑小组' : '新建小组'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="小组名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="成员">
          <el-select v-model="form.memberUserIds" multiple style="width: 100%">
            <el-option v-for="member in members" :key="member.id" :label="member.username" :value="member.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveTeam">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import v1Client from '../../../api/v1/client'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const teams = ref([])
const members = ref([])
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({ name: '', memberUserIds: [] })

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [teamsRes, membersRes] = await Promise.all([
      v1Client.get('/teams'),
      v1Client.get('/teams/members')
    ])
    teams.value = teamsRes.data
    members.value = membersRes.data
  } catch (err) {
    error.value = err.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', memberUserIds: [] }
  dialogVisible.value = true
}

async function openEdit(team) {
  editing.value = team
  const { data } = await v1Client.get(`/teams/${team.id}`)
  form.value = {
    name: data.name,
    memberUserIds: data.members.map((m) => m.id)
  }
  dialogVisible.value = true
}

async function saveTeam() {
  saving.value = true
  try {
    if (editing.value) {
      await v1Client.put(`/teams/${editing.value.id}`, form.value)
      ElMessage.success('小组已更新')
    } else {
      await v1Client.post('/teams', form.value)
      ElMessage.success('小组已创建')
    }
    dialogVisible.value = false
    await loadAll()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar h3 {
  margin: 0;
}
</style>
