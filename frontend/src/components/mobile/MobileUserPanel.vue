<template>
  <div class="mobile-user-panel">
    <div class="panel-header">
      <el-page-header @back="goBackHome" :title="'返回'" content="用户中心" />
      <el-tabs v-model="activeTab" class="header-tabs">
        <el-tab-pane label="个人信息" name="profile" />
        <el-tab-pane label="邮箱管理" name="emails" />
        <el-tab-pane label="Bark管理" name="bark" />
      </el-tabs>
    </div>

    <div class="panel-content">
      <!-- 个人信息 -->
      <div v-if="activeTab === 'profile'">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>
          
          <el-form :model="userInfo" label-width="80px" size="large">
            <el-form-item label="用户名">
              <el-input v-model="userInfo.username" disabled />
            </el-form-item>
            <el-form-item label="主邮箱">
              <el-input v-model="userInfo.email" disabled />
            </el-form-item>
            <el-form-item label="身份">
              <el-tag :type="userInfo.is_admin ? 'success' : 'info'" size="small">
                {{ userInfo.is_admin ? '管理员' : '普通用户' }}
              </el-tag>
            </el-form-item>
          </el-form>

          <div class="action-buttons">
            <el-button type="primary" @click="showChangePasswordDialog = true">
              修改密码
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 邮箱管理 -->
      <div v-else-if="activeTab === 'emails'">
        <div class="action-bar">
          <el-button type="primary" @click="showAddEmailDialog = true" size="small">
            <el-icon><Plus /></el-icon>添加邮箱
          </el-button>
        </div>

        <el-table
          :data="emails"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa' }"
          empty-text="这里空空如也哟"
          size="small"
        >
          <el-table-column prop="email" label="邮箱地址" min-width="180" />
          <el-table-column label="操作" width="70" fixed="right">
            <template #default="scope">
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="handleDeleteEmail(scope.row)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Bark管理 -->
      <div v-else>
        <div class="action-bar">
          <el-button type="primary" @click="showAddBarkDialog = true" size="small">
            <el-icon><Plus /></el-icon>添加Bark
          </el-button>
        </div>

        <el-table
          :data="barkAccounts"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa' }"
          empty-text="这里空空如也哟"
          size="small"
        >
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="base_url" label="推送地址" min-width="180" />
          <el-table-column label="操作" width="70" fixed="right">
            <template #default="scope">
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="handleDeleteBark(scope.row)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="showChangePasswordDialog"
      title="修改密码"
      width="90%"
    >
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-width="100px"
        size="large"
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

    <!-- 添加邮箱对话框 -->
    <el-dialog
      v-model="showAddEmailDialog"
      title="添加邮箱"
      width="90%"
    >
      <el-form
        :model="emailForm"
        :rules="emailRules"
        ref="emailFormRef"
        label-width="80px"
        size="large"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="emailForm.email" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddEmailDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddEmail">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加Bark对话框 -->
    <el-dialog
      v-model="showAddBarkDialog"
      title="添加Bark"
      width="90%"
    >
      <el-form
        :model="barkForm"
        :rules="barkRules"
        ref="barkFormRef"
        label-width="80px"
        size="large"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="barkForm.name" />
        </el-form-item>
        <el-form-item label="推送地址" prop="base_url">
          <el-input v-model="barkForm.base_url" placeholder="例如：https://api.day.app/xxxxx" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddBarkDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddBark">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { useRouter } from 'vue-router';

const props = defineProps({
  token: String
});

const activeTab = ref('profile');
const userInfo = ref({});
const emails = ref([]);
const barkAccounts = ref([]);

const showChangePasswordDialog = ref(false);
const showAddEmailDialog = ref(false);
const showAddBarkDialog = ref(false);

const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
});

const emailForm = ref({
  email: ''
});

const barkForm = ref({
  name: '',
  base_url: ''
});

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

const emailRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
};

const barkRules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  base_url: [
    { required: true, message: '请输入推送地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入正确的URL地址', trigger: 'blur' }
  ]
};

const passwordFormRef = ref(null);
const emailFormRef = ref(null);
const barkFormRef = ref(null);

const router = useRouter();

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

async function handleAddEmail() {
  if (!emailFormRef.value) return;
  
  try {
    await emailFormRef.value.validate();
    await axios.post('/api/user/emails', emailForm.value, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('添加邮箱成功');
    showAddEmailDialog.value = false;
    emailForm.value.email = '';
    fetchEmails();
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '添加邮箱失败');
  }
}

async function handleDeleteEmail(email) {
  try {
    await ElMessageBox.confirm(
      `确定要删除邮箱"${email.email}"吗？`,
      '删除邮箱',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`/api/user/emails/${email.id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除成功');
    fetchEmails();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

async function handleAddBark() {
  if (!barkFormRef.value) return;
  
  try {
    await barkFormRef.value.validate();
    await axios.post('/api/user/bark-accounts', barkForm.value, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('添加Bark成功');
    showAddBarkDialog.value = false;
    barkForm.value = {
      name: '',
      base_url: ''
    };
    fetchBarkAccounts();
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '添加Bark失败');
  }
}

async function handleDeleteBark(bark) {
  try {
    await ElMessageBox.confirm(
      `确定要删除Bark账户"${bark.name}"吗？`,
      '删除Bark',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`/api/user/bark-accounts/${bark.id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除成功');
    fetchBarkAccounts();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

function goBackHome() {
  router.push('/');
}

onMounted(() => {
  fetchUserInfo();
  fetchEmails();
  fetchBarkAccounts();
});
</script>

<style lang="scss" scoped>
.mobile-user-panel {
  padding: 10px;
  
  .panel-header {
    margin-bottom: 20px;
    
    .header-tabs {
      margin-top: 15px;
    }
  }
  
  .action-bar {
    margin-bottom: 15px;
    display: flex;
    justify-content: flex-end;
  }
  
  .profile-card {
    .card-header {
      font-size: 14px;
    }
    
    .action-buttons {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }

  :deep(.el-form-item__label) {
    font-size: 14px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    font-size: 14px;
  }

  :deep(.el-table) {
    font-size: 13px;
  }
}
</style> 