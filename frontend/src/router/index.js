import { createRouter, createWebHistory } from 'vue-router'
import LoginRegister from '../components/LoginRegister.vue'
import CountdownManager from '../components/CountdownManager.vue'
import UserPanel from '../components/UserPanel.vue'
import AdminPanel from '../components/AdminPanel.vue'

// 移动端组件
import MobileLoginRegister from '../components/mobile/MobileLoginRegister.vue'
import MobileCountdownManager from '../components/mobile/MobileCountdownManager.vue'
import MobileUserPanel from '../components/mobile/MobileUserPanel.vue'
import MobileAdminPanel from '../components/mobile/MobileAdminPanel.vue'

// 检测是否为移动设备
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => {
      return isMobile() 
        ? Promise.resolve(MobileCountdownManager)
        : Promise.resolve(CountdownManager)
    },
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: () => {
      return isMobile()
        ? Promise.resolve(MobileLoginRegister)
        : Promise.resolve(LoginRegister)
    }
  },
  {
    path: '/user',
    name: 'user',
    component: () => {
      return isMobile()
        ? Promise.resolve(MobileUserPanel)
        : Promise.resolve(UserPanel)
    },
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => {
      return isMobile()
        ? Promise.resolve(MobileAdminPanel)
        : Promise.resolve(AdminPanel)
    },
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === '1'
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next('/')
  } else {
    next()
  }
})

export default router 