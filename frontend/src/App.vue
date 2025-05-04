<template>
  <div class="app-container" :class="{ 'is-mobile': isMobile }">
    <template v-if="token">
      <!-- 移动端导航 -->
      <div v-if="isMobile" class="mobile-header">
        <div class="logo-title">
          <el-icon class="mr-10"><Timer /></el-icon>
          <h2>NOTICE!</h2>
        </div>
        <el-dropdown @command="handleCommand" trigger="click">
          <div class="user-trigger">
            <el-button type="primary" size="small">
              {{ username }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="home">
                <el-icon><Timer /></el-icon>倒计时
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><User /></el-icon>个人中心
              </el-dropdown-item>
              <el-dropdown-item v-if="isAdmin" command="admin">
                <el-icon><Setting /></el-icon>管理后台
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      
      <!-- 桌面端导航 -->
      <div v-else class="desktop-header">
        <div class="logo">
          <el-icon><Timer /></el-icon>
          <span>NOTICE!</span>
        </div>
        <div class="nav-menu">
          <el-menu mode="horizontal" :router="true" :default-active="$route.path">
            <el-menu-item index="/">
              <el-icon><Timer /></el-icon>倒计时
            </el-menu-item>
            <el-menu-item index="/user">
              <el-icon><User /></el-icon>个人中心
            </el-menu-item>
            
          </el-menu>
        </div>
        <div class="user-menu">
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="user-dropdown">
              <el-icon><User /></el-icon>
              {{ username }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isAdmin" command="admin">
                  <el-icon><Setting /></el-icon>管理后台
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>
    
    <div class="main-content">
      <router-view
        v-if="!token"
        @loginSuccess="handleLoginSuccess"
      />
      <router-view
        v-else
        :token="token"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Timer, Setting, User, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const token = ref(localStorage.getItem('token'))
const username = ref(localStorage.getItem('username'))
const isAdmin = ref(localStorage.getItem('is_admin') === '1')
const isMobile = ref(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))

// 监听管理员状态变化
watch(isAdmin, (newVal) => {
  console.log('管理员状态变化:', newVal)
})

function handleCommand(command) {
  switch (command) {
    case 'home':
      router.push('/')
      break
    case 'settings':
      router.push('/user')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      handleLogout()
      break
  }
}

async function handleLogout() {
  try {
    // 先清除存储，这会触发 watch
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('is_admin')
    
    // 再清除状态
    token.value = null
    username.value = null
    isAdmin.value = false
    
    // 最后再跳转
    await router.push('/login')
    ElMessage.success('已退出登录')
  } catch (error) {
    console.error('退出登录时发生错误:', error)
  }
}

function handleLoginSuccess(data) {
  console.log('登录数据:', data)
  token.value = data.token
  username.value = data.username
  isAdmin.value = Boolean(data.is_admin)
  console.log('设置管理员状态:', isAdmin.value, data.is_admin)
  
  localStorage.setItem('token', data.token)
  localStorage.setItem('username', data.username)
  localStorage.setItem('is_admin', data.is_admin ? '1' : '0')
  router.push('/')
}

// 修改路由守卫逻辑
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === '1'
  
  if (to.path === '/login') {
    next()
  } else if (!token) {
    next('/login')
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next('/')
  } else {
    next()
  }
})

onMounted(() => {
  // 从 localStorage 恢复状态
  token.value = localStorage.getItem('token')
  username.value = localStorage.getItem('username')
  isAdmin.value = localStorage.getItem('is_admin') === '1'
  // console.log('初始化管理员状态:', isAdmin.value)
  // console.log('localStorage is_admin:', localStorage.getItem('is_admin'))
  // console.log('isMobile:', isMobile.value)
  
  if (!token.value && router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
})
</script>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  background: #f6f6f6;
  
  &.is-mobile {
    .mobile-header {
      padding: 10px 16px;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      
      .logo-title {
        display: flex;
        align-items: center;
        gap: 8px;
        h2 {
          margin: 0;
          font-size: 20px;
          color: var(--el-color-primary);
        }
      }

      .user-trigger {
        padding: 4px;
        border-radius: 20px;
        cursor: pointer;
        transition: background-color 0.3s;
        
        &:active {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .el-button {
          margin: 0;
        }
      }

      :deep(.el-dropdown-menu) {
        padding: 4px;
        min-width: 120px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        
        .el-dropdown-menu__item {
          padding: 8px 16px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          line-height: 1.4;
          
          .el-icon {
            margin: 0;
            font-size: 16px;
          }
          
          &:hover {
            background-color: var(--el-color-primary-light-9);
          }
          
          &.el-dropdown-menu__item--divided {
            border-top: 1px solid var(--el-border-color-lighter);
            margin-top: 4px;
            padding-top: 8px;
          }
        }
      }
    }
    
    .main-content {
      padding: 16px;
    }
  }
  
  .desktop-header {
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    padding: 0 24px;
    height: 60px;
    position: sticky;
    top: 0;
    z-index: 100;
    
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-weight: bold;
      margin-right: 40px;
      color: var(--el-color-primary);
    }
    
    .nav-menu {
      flex: 1;
      .el-menu {
        border: none;
        background: transparent;
      }
      :deep(.el-menu-item) {
        font-size: 15px;
        .el-icon {
          margin-right: 4px;
        }
      }
    }
    
    .user-menu {
      margin-left: 20px;
      .user-dropdown {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: var(--el-text-color-primary);
        padding: 0 8px;
        height: 32px;
        border-radius: 16px;
        transition: all 0.3s;
        
        &:hover {
          background: var(--el-fill-color-light);
        }
      }
    }
  }
  
  .main-content {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  padding: 8px 16px;
  
  .el-icon {
    margin-right: 4px;
  }
}
</style>