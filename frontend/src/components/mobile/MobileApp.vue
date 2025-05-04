<template>
  <div class="mobile-app">
    <el-container class="app-container">
      <el-header height="50px" class="app-header">
        <div class="header-content">
          <div class="logo-title">
            <el-icon class="mr-10"><Timer /></el-icon>
            <h2>NOTICE!</h2>
          </div>
          <div v-if="token" class="header-actions">
            <el-dropdown @command="handleCommand" trigger="click">
              <el-button type="primary" size="small">
                {{ userInfo.username }}
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="userInfo.is_admin" command="admin">
                    <el-icon><Setting /></el-icon>
                    管理后台
                  </el-dropdown-item>
                  <el-dropdown-item command="settings">
                    <el-icon><Setting /></el-icon>
                    个人设置
                  </el-dropdown-item>
                  <el-dropdown-item command="logout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>
      
      <el-main>
        <div v-if="!token" class="login-container">
          <el-card class="login-card">
            <MobileLoginRegister @loginSuccess="onLoginSuccess" />
          </el-card>
        </div>
        <template v-else>
          <MobileCountdownManager v-if="!showAdmin && !showSettings" :token="token" />
          <MobileAdminPanel v-else-if="showAdmin" :token="token" @back="showAdmin = false" />
          <MobileUserPanel v-else :token="token" @back="showSettings = false" />
        </template>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Timer, Setting, SwitchButton, ArrowDown } from '@element-plus/icons-vue';
import MobileLoginRegister from './MobileLoginRegister.vue';
import MobileCountdownManager from './MobileCountdownManager.vue';
import MobileAdminPanel from './MobileAdminPanel.vue';
import MobileUserPanel from './MobileUserPanel.vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const token = ref(localStorage.getItem('token'));
const userInfo = ref({});
const showAdmin = ref(false);
const showSettings = ref(false);

async function fetchUserInfo(token) {
  try {
    const res = await axios.get('/api/user', { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    userInfo.value = res.data;
    localStorage.setItem('userInfo', JSON.stringify(res.data));
  } catch (error) {
    ElMessage.error('获取用户信息失败');
  }
}

function onLoginSuccess(newToken) {
  token.value = newToken;
  localStorage.setItem('token', newToken);
  fetchUserInfo(newToken);
  ElMessage.success('登录成功');
}

function logout() {
  token.value = '';
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  userInfo.value = {};
  showAdmin.value = false;
  showSettings.value = false;
  ElMessage.success('已退出登录');
}

function handleCommand(command) {
  if (command === 'logout') {
    logout();
  } else if (command === 'admin') {
    showAdmin.value = true;
    showSettings.value = false;
  } else if (command === 'settings') {
    showSettings.value = true;
    showAdmin.value = false;
  }
}

if(token.value) fetchUserInfo(token.value);
</script>

<style lang="scss" scoped>
.mobile-app {
  .app-container {
    min-height: 100vh;
    background-color: #f5f7fa;
    
    .el-main {
      padding: 10px;
      height: 100%;
      overflow-x: hidden;
    }
  }

  .app-header {
    background-color: #fff;
    border-bottom: 1px solid #dcdfe6;
    padding: 0 15px;
    
    .header-content {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo-title {
      display: flex;
      align-items: center;
      
      h2 {
        margin: 0;
        font-size: 18px;
        color: var(--el-color-primary);
      }
    }
  }

  .login-container {
    height: calc(100vh - 50px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    
    .login-card {
      width: 100%;
      max-width: 400px;
    }
  }

  .mr-10 {
    margin-right: 10px;
  }
}
</style> 