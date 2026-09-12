
import { defineStore } from 'pinia'
import axios from '../api/client'

const API_URL = '/api'

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null
  } catch (error) {
    localStorage.removeItem('user')
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: getStoredUser(),
    token: localStorage.getItem('token') || null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isManager: (state) => state.user?.role === 'manager'
  },

  actions: {
    async register({ username, password, departmentId }) {
      try {
        await axios.post(`${API_URL}/v1/auth/register`, {
          username,
          password,
          departmentId
        })
      } catch (error) {
        const body = error.response?.data
        if (body?.message) {
          throw body.message
        }
        if (error.response?.status === 409) {
          throw '用户名已存在'
        }
        throw '注册失败，请稍后重试'
      }
    },

    async login(username, password) {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          username,
          password
        })
        
        this.token = response.data.token
        this.user = response.data.user
        
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        
        return response.data
      } catch (error) {
        // 如果后端返回了具体的错误信息，就使用后端的错误信息
        // 否则根据状态码判断错误类型
        if (error.response?.data?.error) {
          throw error.response.data.error
        } else if (error.code === 'ECONNREFUSED') {
          throw '无法连接到服务器，请检查服务器是否启动'
        } else if (error.response?.status === 401) {
          throw '账号或密码错误'
        } else {
          throw '登录失败，请稍后重试'
        }
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    syncFromStorage() {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      this.token = token
      try {
        this.user = storedUser ? JSON.parse(storedUser) : null
      } catch (error) {
        this.logout()
      }
    },

    async updatePassword(currentPassword, newPassword) {
      try {
        await axios.put(`${API_URL}/users/password`, {
          currentPassword,
          newPassword
        }, {
          headers: { Authorization: `Bearer ${this.token}` }
        })
      } catch (error) {
        throw error.response?.data?.error || 'Password update failed'
      }
    }
  }
})

