<template>
  <div class="employee-management">
    <div class="header">
      <h3>员工管理</h3>
      <el-button type="primary" @click="showCreateDialog = true">添加员工</el-button>
    </div>

    <!-- 添加员工对话框 -->
    <el-dialog v-model="showCreateDialog" title="添加员工" width="500px">
      <el-form :model="newEmployee" :rules="rules" ref="employeeFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="newEmployee.username" placeholder="请输入用户名" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input v-model="newEmployee.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        
        <el-form-item label="部门" prop="department">
          <el-input v-model="newEmployee.department" placeholder="请输入部门" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createEmployee" :loading="loading">创建</el-button>
      </template>
    </el-dialog>

    <!-- 员工列表 -->
    <el-table :data="employees" style="width: 100%" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="department" label="部门" />
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag>{{ row.role === 'manager' ? '经理' : '员工' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click="deleteEmployee(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 员工进度详情对话框 -->
    <el-dialog v-model="showProgressDialog" title="员工工作进度" width="800px">
      <div v-if="selectedEmployee">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户名">{{ selectedEmployee.username }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ selectedEmployee.department }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag>{{ selectedEmployee.role === 'manager' ? '经理' : '员工' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(selectedEmployee.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>工作进度统计</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card shadow="hover">
              <div class="progress-card">
                <h4>年度计划</h4>
                <div class="progress-stats">
                  <span class="total">总计: {{ employeeProgress.annual.total }}</span>
                  <span class="completed">完成: {{ employeeProgress.annual.completed }}</span>
                  <span class="in-progress">进行中: {{ employeeProgress.annual.in_progress }}</span>
                  <span class="pending">待开始: {{ employeeProgress.annual.pending }}</span>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="8">
            <el-card shadow="hover">
              <div class="progress-card">
                <h4>月度计划</h4>
                <div class="progress-stats">
                  <span class="total">总计: {{ employeeProgress.monthly.total }}</span>
                  <span class="completed">完成: {{ employeeProgress.monthly.completed }}</span>
                  <span class="in-progress">进行中: {{ employeeProgress.monthly.in_progress }}</span>
                  <span class="pending">待开始: {{ employeeProgress.monthly.pending }}</span>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="8">
            <el-card shadow="hover">
              <div class="progress-card">
                <h4>周计划</h4>
                <div class="progress-stats">
                  <span class="total">总计: {{ employeeProgress.weekly.total }}</span>
                  <span class="completed">完成: {{ employeeProgress.weekly.completed }}</span>
                  <span class="in-progress">进行中: {{ employeeProgress.weekly.in_progress }}</span>
                  <span class="pending">待开始: {{ employeeProgress.weekly.pending }}</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '../api/client'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'EmployeeManagement',
  setup() {
    const authStore = useAuthStore()
    const employees = ref([])
    const loading = ref(false)
    const showCreateDialog = ref(false)
    const showProgressDialog = ref(false)
    const selectedEmployee = ref(null)
    const employeeProgress = ref({
      annual: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      monthly: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      weekly: { total: 0, completed: 0, in_progress: 0, pending: 0 }
    })
    const employeeFormRef = ref()

    const newEmployee = ref({
      username: '',
      password: '',
      department: ''
    })

    const rules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
      department: [{ required: true, message: '请输入部门', trigger: 'blur' }]
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const fetchEmployees = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        employees.value = response.data
      } catch (error) {
        ElMessage.error('获取员工列表失败')
      } finally {
        loading.value = false
      }
    }

    const createEmployee = async () => {
      if (!employeeFormRef.value) return

      await employeeFormRef.value.validate(async (valid) => {
        if (valid) {
          loading.value = true
          try {
            await axios.post('/api/auth/register', {
              ...newEmployee.value,
              role: 'employee'
            }, {
              headers: { Authorization: `Bearer ${authStore.token}` }
            })
            ElMessage.success('员工创建成功')
            showCreateDialog.value = false
            resetForm()
            fetchEmployees()
          } catch (error) {
            ElMessage.error('创建员工失败')
          } finally {
            loading.value = false
          }
        }
      })
    }

    const deleteEmployee = async (employee) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除员工 "${employee.username}" 吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        await axios.delete(`/api/users/${employee.id}`, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        ElMessage.success('员工删除成功')
        fetchEmployees()
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
    }

    const viewEmployeeProgress = async (employee) => {
      selectedEmployee.value = employee
      try {
        const response = await axios.get(`/api/users/progress/${employee.id}`, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        employeeProgress.value = response.data
        showProgressDialog.value = true
      } catch (error) {
        ElMessage.error('获取员工进度失败')
      }
    }

    const resetForm = () => {
      newEmployee.value = {
        username: '',
        password: '',
        department: ''
      }
    }

    onMounted(() => {
      fetchEmployees()
    })

    return {
      employees,
      loading,
      showCreateDialog,
      showProgressDialog,
      selectedEmployee,
      employeeProgress,
      newEmployee,
      rules,
      employeeFormRef,
      formatDate,
      createEmployee,
      deleteEmployee,
      viewEmployeeProgress
    }
  }
}
</script>

<style scoped>
.employee-management {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h3 {
  margin: 0;
  color: #333;
}

.progress-card {
  text-align: center;
}

.progress-card h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.progress-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-stats span {
  font-size: 14px;
}

.progress-stats .total {
  color: #666;
  font-weight: bold;
}

.progress-stats .completed {
  color: #67c23a;
}

.progress-stats .in-progress {
  color: #e6a23c;
}

.progress-stats .pending {
  color: #909399;
}
</style>

