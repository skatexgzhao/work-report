
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import EmployeeDashboard from '../views/EmployeeDashboard.vue'
import ManagerDashboard from '../views/ManagerDashboard.vue'
import AppLayout from '../layouts/AppLayout.vue'
import AppHome from '../views/v1/AppHome.vue'
import DailyReportList from '../views/v1/DailyReportList.vue'
import DailyReportEdit from '../views/v1/DailyReportEdit.vue'
import PeriodReportList from '../views/v1/PeriodReportList.vue'
import PeriodReportEdit from '../views/v1/PeriodReportEdit.vue'
import DepartmentReportList from '../views/v1/DepartmentReportList.vue'
import DepartmentReportEdit from '../views/v1/DepartmentReportEdit.vue'
import TemplateAdmin from '../views/v1/admin/TemplateAdmin.vue'
import AiConfigAdmin from '../views/v1/admin/AiConfigAdmin.vue'
import TeamAdmin from '../views/v1/admin/TeamAdmin.vue'
import UserAdmin from '../views/v1/admin/UserAdmin.vue'
import TeamReportList from '../views/v1/TeamReportList.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'AppHome', component: AppHome },
      { path: 'daily', name: 'DailyReportList', component: DailyReportList },
      { path: 'daily/:date', name: 'DailyReportEdit', component: DailyReportEdit },
      { path: 'period', name: 'PeriodReportList', component: PeriodReportList },
      { path: 'period/:id', name: 'PeriodReportEdit', component: PeriodReportEdit },
      { path: 'department', name: 'DepartmentReportList', component: DepartmentReportList, meta: { requiresManager: true } },
      { path: 'department/:id', name: 'DepartmentReportEdit', component: DepartmentReportEdit, meta: { requiresManager: true } },
      { path: 'team', name: 'TeamReportList', component: TeamReportList, meta: { requiresManager: true } },
      { path: 'team/:id', name: 'TeamReportEdit', component: PeriodReportEdit, meta: { requiresManager: true } },
      { path: 'admin/users', name: 'UserAdmin', component: UserAdmin, meta: { requiresAdmin: true } },
      { path: 'admin/templates', name: 'TemplateAdmin', component: TemplateAdmin, meta: { requiresAdmin: true } },
      { path: 'admin/teams', name: 'TeamAdmin', component: TeamAdmin, meta: { requiresManager: true } },
      { path: 'admin/ai-config', name: 'AiConfigAdmin', component: AiConfigAdmin, meta: { requiresAdmin: true } }
    ]
  },
  {
    path: '/employee',
    name: 'EmployeeDashboard',
    component: EmployeeDashboard,
    meta: { requiresAuth: true, role: 'employee' }
  },
  {
    path: '/manager',
    name: 'ManagerDashboard',
    component: ManagerDashboard,
    meta: { requiresAuth: true, role: 'manager' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

function homePathForRole(role) {
  return '/app'
}

router.beforeEach((to, from, next) => {
  let token = localStorage.getItem('token')
  let user = {}

  try {
    user = JSON.parse(localStorage.getItem('user') || '{}')
  } catch (error) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    token = null
  }

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin && user.role !== 'admin') {
    next('/app')
  } else if (to.meta.requiresManager && !['manager', 'admin'].includes(user.role)) {
    next('/app')
  } else if (to.path === '/login' && token && user.role) {
    next(homePathForRole(user.role))
  } else if (to.meta.role && to.meta.role !== user.role && user.role !== 'admin') {
    next(homePathForRole(user.role))
  } else {
    next()
  }
})

export default router
