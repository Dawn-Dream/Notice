<template>
  <div class="user-panel">
    <el-page-header @back="$emit('back')" :title="'返回'" content="用户面板" class="panel-header" />
    <el-card class="section-card">
      <template #header>
        <span>通知邮箱管理</span>
      </template>
      <div class="main-email">
        <el-tag type="success">主邮箱：{{ userInfo.email }}</el-tag>
      </div>
      <el-form @submit.prevent="addEmail" :inline="true" class="email-form">
        <el-form-item>
          <el-input v-model="newEmail" placeholder="新邮箱" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addEmail">添加</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="emails" style="width: 100%" empty-text="这里空空如也哟">
        <el-table-column prop="email" label="邮箱地址" />
        <el-table-column align="right" width="80">
          <template #default="scope">
            <el-button type="danger" icon="el-icon-delete" circle @click="delEmail(scope.row.id)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card">
      <template #header>
        <span>Bark推送账户管理</span>
      </template>
      <el-form @submit.prevent="addBarkAccount" :inline="true" class="bark-form">
        <el-form-item>
          <el-input v-model="newBark.name" placeholder="备注/名称" style="width: 100px;" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="newBark.base_url" placeholder="BaseUrl" style="width: 180px;" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="newBark.api_key" placeholder="API Key" style="width: 180px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addBarkAccount">添加</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="barkAccounts" style="width: 100%" empty-text="暂无Bark账户">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="base_url" label="BaseUrl">
          <template #default="scope">
            <el-tooltip :content="scope.row.base_url">
              <span class="ellipsis">{{ scope.row.base_url }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="api_key" label="API Key">
          <template #default="scope">
            <el-tooltip :content="scope.row.api_key">
              <span class="ellipsis">{{ scope.row.api_key }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column align="right" width="80">
          <template #default="scope">
            <el-button type="danger" :icon="Delete" circle @click="delBarkAccount(scope.row.id)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
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
  if (!newEmail.value) return;
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
  if (!newBark.name || !newBark.base_url || !newBark.api_key) return;
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

onMounted(() => {
  fetchUserInfo();
  fetchEmails();
  fetchBarkAccounts();
});
</script>

<style lang="scss" scoped>
.user-panel {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 0 40px 0;
  background: none;
  .panel-header {
    margin-bottom: 24px;
  }
  .section-card {
    margin-bottom: 32px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.04);
    border-radius: 10px;
    .el-form {
      margin-bottom: 16px;
    }
    .el-table {
      margin-top: 8px;
      width: 100% !important;
    }
  }
  .main-email {
    margin-bottom: 16px;
  }
  .ellipsis {
    display: inline-block;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }
}
</style> 