<template>
  <div class="user-panel">
    <el-row justify="center">
      <el-col :span="24">
        <!-- 个人信息卡片 -->
        <el-card class="main-card">
          <template #header>
            <div class="card-header">个人信息</div>
          </template>
          <div class="card-content">
            <el-form :model="userInfo" label-width="80px">
              <el-form-item label="用户名">
                <el-input v-model="userInfo.username" disabled />
              </el-form-item>
              <el-form-item label="主邮箱">
                <el-input v-model="userInfo.email" disabled />
              </el-form-item>
              <el-form-item label="身份">
                <el-tag :type="userInfo.is_admin ? 'success' : 'info'" class="full-width">
                  {{ userInfo.is_admin ? '管理员' : '普通用户' }}
                </el-tag>
              </el-form-item>
            </el-form>
            <div class="action-buttons">
              <el-button type="primary" @click="showChangePasswordDialog = true">修改密码</el-button>
            </div>
          </div>
        </el-card>

        <el-card class="main-card">
          <template #header>
            <div class="card-header">通知邮箱管理</div>
          </template>
          <div class="card-content">
            <div class="email-row-flex">
              <el-tag type="success" class="main-tag">主邮箱：{{ userInfo.email }}</el-tag>
              <el-form @submit.prevent="addEmail" :inline="true" class="email-form">
                <el-form-item>
                  <el-input v-model="newEmail" placeholder="新邮箱" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="addEmail">添加</el-button>
                </el-form-item>
              </el-form>
            </div>
            <el-table :data="emails" class="main-table" empty-text="这里空空如也哟">
              <el-table-column prop="email" label="邮箱地址" min-width="200" align="left" />
              <el-table-column align="right" width="100">
                <template #default="scope">
                  <el-button type="danger" :icon="Delete" circle @click="delEmail(scope.row.id)" class="delete-btn" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <el-card class="main-card">
          <template #header>
            <div class="card-header">Bark推送账户管理</div>
          </template>
          <div class="card-content">
            <div class="bark-form-container">
              <el-form @submit.prevent="addBarkAccount" :inline="true" class="bark-form">
                <el-form-item>
                  <el-input v-model="newBark.name" placeholder="名称" />
                </el-form-item>
                <el-form-item>
                  <el-input v-model="newBark.base_url" placeholder="BaseUrl" />
                </el-form-item>
                <el-form-item>
                  <el-input v-model="newBark.api_key" placeholder="API Key" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="addBarkAccount">添加</el-button>
                </el-form-item>
              </el-form>
            </div>
            <el-table :data="barkAccounts" class="main-table" empty-text="暂无Bark账户">
              <el-table-column prop="name" label="名称" min-width="120" align="left" />
              <el-table-column prop="base_url" label="BaseUrl" min-width="180" align="left">
                <template #default="scope">
                  <el-tooltip :content="scope.row.base_url">
                    <span class="ellipsis">{{ scope.row.base_url }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column prop="api_key" label="API Key" min-width="180" align="left">
                <template #default="scope">
                  <el-tooltip :content="scope.row.api_key">
                    <span class="ellipsis">{{ scope.row.api_key }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column align="right" width="100">
                <template #default="scope">
                  <el-button type="danger" :icon="Delete" circle @click="delBarkAccount(scope.row.id)" class="delete-btn" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="showChangePasswordDialog"
      title="修改密码"
      width="400px"
    >
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-width="100px"
      >
        <el-form-item label="原密码" prop="old_password">
          <el-input
            v-model="passwordForm.old_password"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="new_password">
          <el-input
            v-model="passwordForm.new_password"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirm_password">
          <el-input
            v-model="passwordForm.confirm_password"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangePasswordDialog = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { Delete } from '@element-plus/icons-vue';

const props = defineProps({ token: String });
const userInfo = ref({});
const emails = ref([]);
const newEmail = ref('');
const barkAccounts = ref([]);
const newBark = reactive({ name: '', base_url: '', api_key: '' });
const showChangePasswordDialog = ref(false);
const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
});

// 添加邮箱验证规则
const emailRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
};

// 添加 Bark 账户验证规则
const barkRules = {
  name: [
    { required: true, message: '请输入账户名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  base_url: [
    { required: true, message: '请输入 BaseUrl', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入正确的 URL 地址', trigger: 'blur' }
  ],
  api_key: [
    { required: true, message: '请输入 API Key', trigger: 'blur' },
    { min: 6, message: 'API Key 不能少于 6 个字符', trigger: 'blur' }
  ]
};

const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入密码'));
  } else {
    if (passwordForm.value.confirm_password !== '') {
      passwordFormRef.value?.validateField('confirm_password');
    }
    callback();
  }
};

const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== passwordForm.value.new_password) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

const passwordRules = {
  old_password: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于 6 个字符', trigger: 'blur' }
  ],
  new_password: [
    { required: true, validator: validatePass, trigger: 'blur' },
    { min: 6, message: '密码长度不能小于 6 个字符', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, validator: validatePass2, trigger: 'blur' }
  ]
};

const passwordFormRef = ref(null);

async function fetchUserInfo() {
  try {
    const res = await axios.get('/api/user', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    userInfo.value = res.data;
  } catch (error) {
    ElMessage.error('获取用户信息失败');
  }
}

async function fetchEmails() {
  try {
    const res = await axios.get('/api/user/emails', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    emails.value = res.data;
  } catch (error) {
    ElMessage.error('获取邮箱列表失败');
  }
}

async function addEmail() {
  if (!newEmail.value) {
    ElMessage.warning('请输入邮箱地址');
    return;
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail.value)) {
    ElMessage.warning('请输入正确的邮箱格式');
    return;
  }

  try {
    await axios.post('/api/user/emails', { email: newEmail.value }, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('添加邮箱成功');
    newEmail.value = '';
    fetchEmails();
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '添加邮箱失败');
  }
}

async function delEmail(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个邮箱吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await axios.delete(`/api/user/emails/${id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除邮箱成功');
    fetchEmails();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除邮箱失败');
    }
  }
}

async function fetchBarkAccounts() {
  try {
    const res = await axios.get('/api/user/bark-accounts', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    barkAccounts.value = res.data;
  } catch (error) {
    ElMessage.error('获取Bark账户失败');
  }
}

async function addBarkAccount() {
  if (!newBark.name || !newBark.base_url || !newBark.api_key) {
    ElMessage.warning('请填写完整的 Bark 账户信息');
    return;
  }

  // 验证 BaseUrl 格式
  if (!/^https?:\/\/.+/.test(newBark.base_url)) {
    ElMessage.warning('请输入正确的 BaseUrl 格式');
    return;
  }

  try {
    await axios.post('/api/user/bark-accounts', newBark, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('添加Bark账户成功');
    newBark.name = '';
    newBark.base_url = '';
    newBark.api_key = '';
    fetchBarkAccounts();
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '添加Bark账户失败');
  }
}

async function delBarkAccount(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个Bark账户吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await axios.delete(`/api/user/bark-accounts/${id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除Bark账户成功');
    fetchBarkAccounts();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除Bark账户失败');
    }
  }
}

async function handleChangePassword() {
  if (!passwordFormRef.value) return;
  
  try {
    await passwordFormRef.value.validate();
    await axios.post('/api/user/change-password', {
      old_password: passwordForm.value.old_password,
      new_password: passwordForm.value.new_password
    }, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('密码修改成功');
    showChangePasswordDialog.value = false;
    passwordForm.value = {
      old_password: '',
      new_password: '',
      confirm_password: ''
    };
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '密码修改失败');
  }
}

onMounted(() => {
  fetchUserInfo();
  fetchEmails();
  fetchBarkAccounts();
});
</script>

<style lang="scss" scoped>
.user-panel {
  min-height: 100vh;
  background: #F6F6F6;
  padding: 24px;

  .main-card {
    max-width: 900px;
    width: 100%;
    margin: 0 auto 24px;
    padding: 32px;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.06);
    border-radius: 16px;
    background: #fff;
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 6px 32px 0 rgba(0,0,0,0.08);
    }

    .card-header {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 28px;
      color: #2c3e50;
      position: relative;
      padding-left: 12px;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 16px;
        background: #409EFF;
        border-radius: 2px;
      }
    }

    .card-content {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }

    // 统一表单布局
    .el-form {
      width: 100%;
      
      .el-form-item {
        margin-bottom: 20px;
        
        :deep(.el-form-item__label) {
          font-weight: 500;
          color: #606266;
        }
        
        :deep(.el-form-item__content) {
          display: flex;
          flex: 1;
          
          .el-input,
          .el-tag {
            width: 100%;
          }
        }

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    // 邮箱管理布局
    .email-row-flex {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;

      .main-tag {
        flex: 0 0 auto;
        min-width: 240px;
        height: 36px;
        line-height: 36px;
        padding: 0 16px;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .email-form {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;

        .el-form-item {
          margin: 0;
          
          &:first-child {
            flex: 1;
            min-width: 200px;
          }

          &:last-child {
            flex: 0 0 auto;
          }

          .el-input {
            width: 100%;
          }
        }
      }
    }

    // Bark表单布局
    .bark-form-container {
      margin-bottom: 24px;

      .bark-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        
        .el-form-item {
          margin: 0;
          
          &:nth-child(1) {
            flex: 0 0 160px;
          }
          
          &:nth-child(2),
          &:nth-child(3) {
            flex: 1;
            min-width: 200px;
          }

          &:last-child {
            flex: 0 0 auto;
          }

          .el-input {
            width: 100%;
          }
        }
      }
    }

    // 表格统一样式
    .main-table {
      width: 100%;
      
      :deep(.el-table) {
        border-radius: 8px;
        overflow: hidden;
        
        .el-table__header-wrapper {
          th {
            background: #f5f7fa;
            font-weight: 600;
            color: #2c3e50;
            height: 44px;
            padding: 8px 16px;
          }
        }

        .el-table__body-wrapper {
          td {
            padding: 12px 16px;
          }
        }
      }

      .ellipsis {
        display: inline-block;
        max-width: 240px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .delete-btn {
        transition: all 0.3s ease;
        
        &:hover {
          background-color: #f56c6c;
          color: white;
        }
      }
    }

    // 按钮容器
    .action-buttons {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;

      .el-button {
        padding: 8px 24px;
      }
    }
  }

  // 移动端适配
  @media screen and (max-width: 768px) {
    padding: 12px;

    .main-card {
      padding: 20px;
      margin-bottom: 16px;

      .card-header {
        font-size: 18px;
        margin-bottom: 20px;
      }

      .email-row-flex {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        
        .main-tag {
          width: 100%;
          min-width: unset;
        }

        .email-form {
          flex-direction: column;
          width: 100%;
          
          .el-form-item {
            width: 100%;
            min-width: unset;

            &:last-child {
              margin-top: 8px;
              
              .el-button {
                width: 100%;
              }
            }
          }
        }
      }

      .bark-form-container {
        .bark-form {
          .el-form-item {
            flex: 1 1 100% !important;
            min-width: unset !important;

            &:last-child {
              margin-top: 8px;
              
              .el-button {
                width: 100%;
              }
            }
          }
        }
      }
    }
  }
}

// 对话框样式统一
:deep(.el-dialog) {
  max-width: 90%;  // 限制对话框最大宽度
  width: 500px !important;  // 增加对话框宽度
  border-radius: 16px;
  overflow: hidden;
  
  .el-dialog__header {
    margin: 0;
    padding: 20px 24px 0;
    
    .el-dialog__title {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }
  }
  
  .el-dialog__body {
    padding: 24px;
  }
  
  .el-dialog__footer {
    padding: 16px 24px 24px;
    border-top: 1px solid #f0f0f0;

    .el-button {
      border-radius: 8px;
      padding: 8px 24px;
    }
  }
}

// 对话框移动端适配
@media screen and (max-width: 768px) {
  :deep(.el-dialog) {
    width: 90% !important;
    margin: 0 auto;
    
    .el-dialog__header {
      padding: 16px 20px 0;
    }
    
    .el-dialog__body {
      padding: 20px;
    }
    
    .el-dialog__footer {
      padding: 12px 20px 16px;
      
      .el-button {
        width: 100%;
        margin-left: 0 !important;
        margin-bottom: 8px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}
</style> 