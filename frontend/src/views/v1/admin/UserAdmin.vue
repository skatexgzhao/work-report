<template>
  <div>
    <div class="toolbar">
      <h3>用户与角色</h3>
      <p class="hint">管理员可将用户设为「管理者」；小组成员请在「小组管理」中由管理者添加。</p>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-alert v-else-if="error" type="error" :title="error" show-icon />

    <el-table v-else :data="users" stripe>
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="department" label="部门" min-width="100" />
      <el-table-column label="角色" width="200">
        <template #default="{ row }">
          <el-select
            v-model="row.role"
            size="small"
            :disabled="row.id === currentUserId"
            @change="(val) => onRoleChange(row, val)"
          >
            <el-option label="员工" value="employee" />
            <el-option label="管理者" value="manager" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import v1Client from '../../../api/v1/client'
import { useAuthStore } from '../../../stores/auth'

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id)

const loading = ref(true)
const error = ref('')
const users = ref([])

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN')
}

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await v1Client.get('/users')
    users.value = data.map((u) => ({ ...u, _snapshotRole: u.role }))
  } catch (err) {
    error.value = err.response?.data?.message || '加载用户列表失败'
  } finally {
    loading.value = false
  }
}

async function onRoleChange(row, newRole) {
  const previous = row._snapshotRole
  if (newRole === previous) return

  try {
    const label = { employee: '员工', manager: '管理者', admin: '管理员' }[newRole] || newRole
    await ElMessageBox.confirm(
      `确定将用户「${row.username}」的角色改为「${label}」吗？对方需重新登录后权限才会完全生效。`,
      '修改角色',
      { type: 'warning' }
    )
    await v1Client.put(`/users/${row.id}`, { role: newRole })
    row._snapshotRole = newRole
    ElMessage.success('角色已更新')
  } catch (err) {
    row.role = previous
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '更新失败')
    }
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}

.toolbar h3 {
  margin: 0 0 8px;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
