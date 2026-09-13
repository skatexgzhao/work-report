
<template>
  <div class="login-container">
    <div class="login-box">
      <h1>智能周报系统</h1>

      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" label-width="80px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleLogin" :loading="loading" style="width: 100%">
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <p class="register-hint">
            注册后默认为员工。请先选部门，再选所属小组（负责人需先在「小组管理」创建小组）。
            若部门下暂无小组，可直接注册，之后由负责人将你加入小组。
          </p>
          <el-form :model="registerForm" :rules="registerRules" ref="registerFormRef" label-width="80px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="registerForm.username" placeholder="2–32 个字符" />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input v-model="registerForm.password" type="password" placeholder="至少 6 位" />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" />
            </el-form-item>

            <el-form-item label="部门" prop="departmentId">
              <el-select
                v-model="registerForm.departmentId"
                placeholder="请选择部门"
                style="width: 100%"
                :loading="departmentsLoading"
                @change="onDepartmentChange"
              >
                <el-option
                  v-for="d in departments"
                  :key="d.id"
                  :label="d.name"
                  :value="d.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item
              v-if="registerForm.departmentId"
              label="小组"
              prop="teamId"
            >
              <el-select
                v-model="registerForm.teamId"
                :placeholder="teamsLoading ? '加载中…' : teams.length ? '请选择所属小组' : '该部门暂无小组（可留空）'"
                style="width: 100%"
                :loading="teamsLoading"
                clearable
              >
                <el-option
                  v-for="t in teams"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleRegister" :loading="registerLoading" style="width: 100%">
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div v-if="showDemoCredentials" class="demo-credentials">
        <el-divider>演示账号</el-divider>
        <p><strong>管理员:</strong> admin / admin123</p>
        <p><strong>部门经理:</strong> manager / manager123</p>
        <p><strong>普通员工:</strong> employee / employee123</p>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const v1Base = import.meta.env.VITE_API_BASE || '/api/v1'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()

    const activeTab = ref(route.query.tab === 'register' ? 'register' : 'login')
    const loginForm = ref({ username: '', password: '' })
    const registerForm = ref({
      username: '',
      password: '',
      confirmPassword: '',
      departmentId: null,
      teamId: null
    })
    const departments = ref([])
    const departmentsLoading = ref(false)
    const teams = ref([])
    const teamsLoading = ref(false)

    const loading = ref(false)
    const registerLoading = ref(false)
    const loginFormRef = ref()
    const registerFormRef = ref()
    const showDemoCredentials = import.meta.env.DEV

    const loginRules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
    }

    const registerRules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码至少 6 位', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请确认密码', trigger: 'blur' },
        {
          validator: (_rule, value, callback) => {
            if (value !== registerForm.value.password) {
              callback(new Error('两次密码不一致'))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ],
      departmentId: [{ required: true, message: '请选择部门', trigger: 'change' }],
      teamId: [
        {
          validator: (_rule, value, callback) => {
            if (teams.value.length > 0 && (value == null || value === '')) {
              callback(new Error('请选择所属小组'))
            } else {
              callback()
            }
          },
          trigger: 'change'
        }
      ]
    }

    async function loadDepartments() {
      departmentsLoading.value = true
      try {
        const { data } = await axios.get(`${v1Base}/departments/public`)
        departments.value = data
      } catch {
        ElMessage.error('无法加载部门列表')
      } finally {
        departmentsLoading.value = false
      }
    }

    async function loadTeamsForDepartment(departmentId) {
      registerForm.value.teamId = null
      teams.value = []
      if (!departmentId) return
      teamsLoading.value = true
      try {
        const { data } = await axios.get(`${v1Base}/teams/public`, {
          params: { departmentId }
        })
        teams.value = data
      } catch {
        ElMessage.error('无法加载小组列表')
      } finally {
        teamsLoading.value = false
      }
    }

    function onDepartmentChange(departmentId) {
      loadTeamsForDepartment(departmentId)
    }

    watch(activeTab, (tab) => {
      if (tab === 'register' && departments.value.length === 0) {
        loadDepartments()
      }
    })

    onMounted(() => {
      if (activeTab.value === 'register') {
        loadDepartments()
      }
    })

    const handleLogin = async () => {
      if (!loginFormRef.value) return

      await loginFormRef.value.validate(async (valid) => {
        if (valid) {
          loading.value = true
          try {
            await authStore.login(loginForm.value.username, loginForm.value.password)
            ElMessage.success('登录成功')
            router.push('/app')
          } catch (error) {
            ElMessage.error(error)
          } finally {
            loading.value = false
          }
        }
      })
    }

    const handleRegister = async () => {
      if (!registerFormRef.value) return

      await registerFormRef.value.validate(async (valid) => {
        if (!valid) return
        registerLoading.value = true
        try {
          await authStore.register({
            username: registerForm.value.username.trim(),
            password: registerForm.value.password,
            departmentId: registerForm.value.departmentId,
            teamId: registerForm.value.teamId
          })
          ElMessage.success('注册成功，请登录')
          loginForm.value.username = registerForm.value.username.trim()
          activeTab.value = 'login'
        } catch (error) {
          ElMessage.error(error)
        } finally {
          registerLoading.value = false
        }
      })
    }

    return {
      activeTab,
      loginForm,
      registerForm,
      departments,
      departmentsLoading,
      teams,
      teamsLoading,
      onDepartmentChange,
      loginRules,
      registerRules,
      loading,
      registerLoading,
      loginFormRef,
      registerFormRef,
      showDemoCredentials,
      handleLogin,
      handleRegister
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 440px;
  max-width: 90%;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 20px;
}

.register-hint {
  font-size: 13px;
  color: #666;
  margin: 0 0 16px;
  line-height: 1.5;
}

.demo-credentials {
  margin-top: 24px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.demo-credentials p {
  margin: 5px 0;
}
</style>
