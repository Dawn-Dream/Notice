import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 检查是否需要管理员权限
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    // 从localStorage获取用户信息
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    if (!userInfo.is_admin) {
      next({ path: '/' }) // 如果不是管理员，重定向到首页
      return
    }
  }
  next()
})

export default router 