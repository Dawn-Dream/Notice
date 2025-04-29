<template>
  <div class="admin-panel">
    <div class="panel-header">
      <el-page-header @back="$emit('back')" :title="'返回'" content="用户管理" />
      <el-tabs v-model="activeTab" class="header-tabs">
        <el-tab-pane label="用户管理" name="users" />
        <el-tab-pane label="倒计时管理" name="countdowns" />
      </el-tabs>
    </div>

    <div class="panel-content">
      <div v-if="activeTab === 'users'">
        <div class="action-bar">
          <el-button type="primary" @click="showAddUserDialog = true" class="add-button">
            <el-icon><Plus /></el-icon>新增用户
          </el-button>
        </div>

        <el-table 
          :data="users" 
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa' }"
          empty-text="这里空空如也哟"
        >
          <el-table-column prop="id" label="ID" width="80" align="left" header-align="left" />
          <el-table-column prop="username" label="用户名" width="180" align="left" header-align="left" />
          <el-table-column prop="email" label="邮箱" min-width="200" align="left" header-align="left" />
          <el-table-column prop="is_admin" label="身份" width="100" align="center" header-align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_admin" type="success">管理员</el-tag>
              <el-tag v-else type="info">普通用户</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="340" fixed="right" header-align="center">
            <template #default="scope">
              <div class="action-buttons">
                <el-button type="primary" @click="handleResetPassword(scope.row)" class="action-button">
                  <el-icon><Key /></el-icon>
                  重置密码
                </el-button>
                <el-button type="warning" @click="handleEditEmail(scope.row)" class="action-button">
                  <el-icon><Message /></el-icon>
                  修改邮箱
                </el-button>
                <el-button type="danger" @click="handleDeleteUser(scope.row)" class="action-button">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-else>
        <el-table 
          :data="countdowns" 
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa' }"
          empty-text="这里空空如也哟"
        >
          <el-table-column prop="id" label="ID" width="80" align="left" header-align="left" />
          <el-table-column prop="title" label="标题" min-width="180" align="left" header-align="left" />
          <el-table-column prop="username" label="创建用户" width="120" align="left" header-align="left" />
          <el-table-column prop="targetDate" label="目标日期" width="180" header-align="center" />
          <el-table-column prop="status" label="状态" width="100" align="center" header-align="center">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'">
                {{ scope.row.status === 'active' ? '活跃' : '已完成' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right" align="center" header-align="center">
            <template #default="scope">
              <el-button type="danger" @click="handleDeleteCountdown(scope.row)" class="action-button">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加用户对话框 -->
    <el-dialog
      v-model="showAddUserDialog"
      title="新增用户"
      width="500px"
    >
      <el-form :model="newUser" :rules="rules" ref="addUserFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="newUser.username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="newUser.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="newUser.email" />
        </el-form-item>
        <el-form-item label="身份" prop="is_admin">
          <el-select v-model="newUser.is_admin">
            <el-option :label="'普通用户'" :value="0" />
            <el-option :label="'管理员'" :value="1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddUserDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddUser">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Delete, Message, Key } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const props = defineProps({
  token: String
});

const activeTab = ref('users');
const users = ref([]);
const countdowns = ref([]);
const showAddUserDialog = ref(false);

const newUser = ref({
  username: '',
  password: '',
  email: '',
  is_admin: 0
});

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
};

const addUserFormRef = ref(null);

// 获取用户列表
async function fetchUsers() {
  try {
    const res = await axios.get('/api/admin/users', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    users.value = res.data;
  } catch (error) {
    ElMessage.error('获取用户列表失败');
  }
}

// 获取倒计时列表
async function fetchCountdowns() {
  try {
    const res = await axios.get('/api/admin/timers', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    countdowns.value = res.data;
  } catch (error) {
    ElMessage.error('获取倒计时列表失败');
  }
}

// 添加用户
async function handleAddUser() {
  try {
    await addUserFormRef.value.validate();
    await axios.post('/api/admin/users', newUser.value, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('添加用户成功');
    showAddUserDialog.value = false;
    fetchUsers();
    newUser.value = { username: '', password: '', email: '', is_admin: 0 };
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '添加用户失败');
  }
}

// 重置密码
async function handleResetPassword(user) {
  try {
    const { value: newPassword } = await ElMessageBox.prompt(
      `请输入新密码（用户：${user.username}）`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'password',
        inputPlaceholder: '请输入新密码',
        inputValidator: (val) => val ? true : '新密码不能为空'
      }
    );
    await axios.post(`/api/admin/users/${user.id}/reset`, { new_password: newPassword }, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('密码重置成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置密码失败');
    }
  }
}

// 修改邮箱
async function handleEditEmail(user) {
  try {
    const { value: newEmail } = await ElMessageBox.prompt(
      `请输入新邮箱（用户：${user.username}）`,
      '修改邮箱',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'email',
        inputValue: user.email,
        inputPlaceholder: '请输入新邮箱',
        inputValidator: (val) => {
          if (!val) return '新邮箱不能为空';
          // 简单邮箱格式校验
          return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val) ? true : '邮箱格式不正确';
        }
      }
    );
    await axios.put(`/api/admin/users/${user.id}/email`, { email: newEmail }, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('修改邮箱成功');
    fetchUsers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.msg || '修改邮箱失败');
    }
  }
}

// 删除用户
async function handleDeleteUser(user) {
  try {
    await ElMessageBox.confirm(`确定要删除用户 ${user.username} 吗？`, '警告', {
      type: 'warning'
    });
    await axios.delete(`/api/admin/users/${user.id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除用户成功');
    fetchUsers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除用户失败');
    }
  }
}

// 删除倒计时
async function handleDeleteCountdown(countdown) {
  try {
    await ElMessageBox.confirm(`确定要删除倒计时 ${countdown.title} 吗？`, '警告', {
      type: 'warning'
    });
    await axios.delete(`/api/admin/timers/${countdown.id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除倒计时成功');
    fetchCountdowns();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除倒计时失败');
    }
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  fetchUsers();
  fetchCountdowns();
});
</script>

<style lang="scss" scoped>
.admin-panel {
  height: 100%;
  width: 80%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  margin: 0 auto;
  
  .panel-header {
    border-bottom: 1px solid #dcdfe6;
    
    .el-page-header {
      padding: 16px 20px;
      border-bottom: 1px solid #dcdfe6;
    }
    
    .header-tabs {
      :deep(.el-tabs__header) {
        margin: 0;
        padding: 0 20px;
      }
      
      :deep(.el-tabs__nav-wrap) {
        padding: 0;
      }
      
      :deep(.el-tabs__item) {
        padding: 0 20px;
        height: 40px;
        line-height: 40px;
      }
    }
  }
  
  .panel-content {
    flex: 1;
    margin: 20px;
    background-color: #fff;
    border-radius: 4px;
    overflow: hidden;
    
    .action-bar {
      margin-bottom: 16px;
      
      .add-button {
        padding: 8px 16px;
        font-size: 14px;
      }
    }

    :deep(.el-table) {
      .el-table__header-wrapper {
        th {
          background-color: #f5f7fa;
          color: #606266;
          font-weight: 500;
          border-bottom: 1px solid #dcdfe6;
        }
      }
      
      .el-table__body-wrapper {
        td {
          padding: 8px 0;
        }
      }
    }
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
  
  .action-button {
    padding: 6px 12px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    
    .el-icon {
      margin-right: 4px;
    }
  }
}

:deep(.el-dialog) {
  border-radius: 4px;
  
  .el-dialog__header {
    margin: 0;
    padding: 16px 20px;
    border-bottom: 1px solid #dcdfe6;
    background-color: #f5f7fa;
  }
  
  .el-dialog__body {
    padding: 20px;
  }
  
  .el-dialog__footer {
    padding: 16px 20px;
    border-top: 1px solid #dcdfe6;
    background-color: #f5f7fa;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
  
  &:hover {
    background-color: #c0c4cc;
  }
}

::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}
</style>