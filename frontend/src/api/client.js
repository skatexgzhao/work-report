import axios from 'axios'
import { ElMessage } from 'element-plus'

const apiClient = axios.create({
  timeout: 60000
})

let authExpiredNotified = false

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if ((status === 401 || status === 403) && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      if (!authExpiredNotified) {
        authExpiredNotified = true
        ElMessage.warning('登录状态已过期，请重新登录')
      }

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
