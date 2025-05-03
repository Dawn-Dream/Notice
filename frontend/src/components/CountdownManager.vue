<template>
  <div class="countdown-manager">
    <el-row justify="center">
      <el-col :span="35">
        <el-card class="main-card">
          <template #header>
            <div class="card-header">
              <span>倒计时管理</span>
              <el-button type="primary" @click="dialogVisible = true" class="add-btn">
                <el-icon><Plus /></el-icon>
                添加倒计时
              </el-button>
            </div>
          </template>
          <el-table
            :data="countdowns"
            style="width: 100%"
            v-loading="loading"
            empty-text="这里空空如也哟"
            class="main-table"
          >
            <el-table-column prop="title" label="标题" min-width="120" align="center" />
            <el-table-column label="时间" min-width="180" align="center">
              <template #default="scope">
                {{ formatTime(scope.row.end_time) }}
              </template>
            </el-table-column>
            <el-table-column align="center" label="周期" min-width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.repeat_type && scope.row.repeat_type !== 'none'" type="success">
                  每{{ scope.row.repeat_value || 1 }}{{ repeatUnitText(scope.row.repeat_type) }}
                </el-tag>
                <el-tag v-else type="info">单次</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" align="center" min-width="120">
              <template #default="scope">
                <el-tag>{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column align="center" label="操作" width="120">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button
                    type="primary"
                    :icon="Edit"
                    @click="editCountdown(scope.row)"
                  />
                  <el-button
                    type="danger"
                    :icon="Delete"
                    @click="handleDelete(scope.row)"
                  />
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div class="usage-tip-card">
            <div class="usage-title">
              <i class="el-icon-info"></i>
              <span>使用提示</span>
            </div>
            <ul class="usage-list">
              <li>支持单次和周期性倒计时提醒，可自定义提醒内容和周期单位。</li>
              <li>可选择通知邮箱和Bark推送账户，支持多邮箱/多设备管理。</li>
              <li>到期后自动推送邮件和Bark通知，周期任务会自动循环。</li>
              <li>所有数据本地存储，支持Docker持久化部署。</li>
              <li>如遇邮件发送失败，请检查SMTP配置和网络环境。</li>
              <li>管理员可在后台管理所有用户和倒计时任务。</li>
            </ul>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加/编辑倒计时对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑倒计时' : '添加倒计时'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :value="'once'">单次提醒</el-radio>
            <el-radio :value="'cycle'">周期提醒</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        
        <el-form-item label="提醒内容" prop="email_content">
          <el-input
            v-model="form.email_content"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        
        <el-form-item label="目标时间" prop="target_time">
          <el-date-picker
            v-model="form.target_time"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
          />
        </el-form-item>
        
        <template v-if="form.type === 'cycle'">
          <el-form-item label="重复间隔" prop="repeat_value">
            <div class="repeat-interval-row">
              <el-input-number
                v-model="form.repeat_value"
                :min="1"
                style="width: 100px"
              />
              <el-select
                v-model="form.repeat_unit"
                style="width: 120px; margin-left: 12px;"
              >
                <el-option label="分钟" value="minute" />
                <el-option label="小时" value="hour" />
                <el-option label="天" value="day" />
                <el-option label="月" value="month" />
                <el-option label="年" value="year" />
              </el-select>
            </div>
          </el-form-item>
          
          <el-form-item label="截止时间" prop="repeat_until">
            <el-date-picker
              v-model="form.repeat_until"
              type="datetime"
              placeholder="选择截止时间（可选）"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
            />
          </el-form-item>
      </template>
        
        <el-form-item label="通知邮箱" prop="notify_email">
          <el-select v-model="form.notify_email">
            <el-option
              :label="`${userInfo.email}（主邮箱）`"
              :value="userInfo.email"
            />
            <el-option
              v-for="e in emails"
              :key="e.id"
              :label="e.email"
              :value="e.email"
            />
          </el-select>
        </el-form-item>
        <!-- 新增Bark账户选择 -->
        <el-form-item label="Bark账户" prop="bark_account_id">
          <el-select v-model="form.bark_account_id" clearable placeholder="不推送Bark可不选">
            <el-option v-for="b in barkAccounts" :key="b.id" :label="b.name + ' - ' + b.base_url" :value="b.id" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">
            确定
          </el-button>
        </span>
        </template>
    </el-dialog>
    <UserPanel v-if="showUserPanel" :token="token" @back="handleBack" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Delete,
  Edit,
  Plus,
  Message
} from '@element-plus/icons-vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const props = defineProps({ token: String });
const loading = ref(false);
const dialogVisible = ref(false);
const formRef = ref();
const countdowns = ref([]);
const emails = ref([]);
const newEmail = ref('');
const userInfo = ref({});
const editing = ref(false);
const editId = ref(null);
let intervalId = null;
const router = useRouter();

const form = reactive({
  type: 'once',
  title: '',
  email_content: '',
  target_time: '',
  repeat_value: 1,
  repeat_unit: 'day',
  repeat_until: '',
  notify_email: '',
  bark_account_id: null
});

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  target_time: [
    { required: true, message: '请选择目标时间', trigger: 'change' }
  ],
  notify_email: [
    { required: true, message: '请选择通知邮箱', trigger: 'change' }
  ]
};

function repeatUnitText(val) {
  const map = {
    minute: '分钟',
    hour: '小时',
    day: '天',
    month: '月',
    year: '年'
  };
  return map[val] || '';
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}

async function fetchCountdowns() {
  loading.value = true;
  try {
    const res = await axios.get('/api/timers', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    const newData = res.data;
    if (countdowns.value.length !== newData.length ||
        !countdowns.value.every((item, idx) => item.id === newData[idx].id)) {
      countdowns.value = newData;
    } else {
      for (let i = 0; i < countdowns.value.length; i++) {
        if (countdowns.value[i].status !== newData[i].status) {
          countdowns.value[i].status = newData[i].status;
        }
      }
    }
  } catch (error) {
    ElMessage.error('获取倒计时列表失败');
  } finally {
    loading.value = false;
  }
}

async function fetchEmails() {
  try {
    const res = await axios.get('/api/user/emails', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
  emails.value = res.data;
    if (userInfo.value.email && !form.notify_email) {
      form.notify_email = userInfo.value.email;
    }
  } catch (error) {
    ElMessage.error('获取邮箱列表失败');
  }
}

async function fetchUserInfo() {
  try {
    const res = await axios.get('/api/user', {
      headers: { Authorization: `Bearer ${props.token}` }
    });
  userInfo.value = res.data;
    if (userInfo.value.email && !form.notify_email) {
      form.notify_email = userInfo.value.email;
    }
  } catch (error) {
    ElMessage.error('获取用户信息失败');
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const data = {
          title: form.title,
          end_time: new Date(form.target_time).toISOString(),
          email_content: form.email_content,
          repeat_type: form.type === 'cycle' ? form.repeat_unit : 'none',
          repeat_value: form.type === 'cycle' ? form.repeat_value : 1,
          repeat_until: form.type === 'cycle' && form.repeat_until
            ? new Date(form.repeat_until).toISOString()
            : null,
          notify_email: form.notify_email,
          bark_account_id: form.bark_account_id
        };

        if (editing.value) {
          await axios.put(`/api/timers/${editId.value}`, data, {
            headers: { Authorization: `Bearer ${props.token}` }
          });
          ElMessage.success('更新成功');
        } else {
          await axios.post('/api/timers', data, {
            headers: { Authorization: `Bearer ${props.token}` }
          });
          ElMessage.success('添加成功');
        }
        
        dialogVisible.value = false;
        resetForm();
  fetchCountdowns();
      } catch (error) {
        ElMessage.error(error.response?.data?.msg || '操作失败');
      }
    }
  });
}

function resetForm() {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  form.type = 'once';
  form.title = '';
  form.email_content = '';
  form.target_time = '';
  form.repeat_value = 1;
  form.repeat_unit = 'day';
  form.repeat_until = '';
  form.notify_email = userInfo.value.email || '';
  form.bark_account_id = null;
  editing.value = false;
  editId.value = null;
}

function editCountdown(item) {
  editing.value = true;
  editId.value = item.id;
  form.title = item.title;
  form.email_content = item.email_content || '';
  form.target_time = item.end_time ? item.end_time.slice(0, 16) : '';
  form.notify_email = item.notify_email;
  form.bark_account_id = item.bark_account_id;
  
  if (item.repeat_type && item.repeat_type !== 'none') {
    form.type = 'cycle';
    form.repeat_unit = item.repeat_type;
    form.repeat_value = item.repeat_value || 1;
    form.repeat_until = item.repeat_until ? item.repeat_until.slice(0, 16) : '';
  } else {
    form.type = 'once';
    form.repeat_unit = 'day';
    form.repeat_value = 1;
    form.repeat_until = '';
  }
  
  dialogVisible.value = true;
}

async function handleDelete(item) {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个倒计时吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await axios.delete(`/api/timers/${item.id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除成功');
  fetchCountdowns();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
}
}

async function addEmail() {
  if (!newEmail.value) return;
  
  try {
    await axios.post('/api/user/emails', {
      email: newEmail.value
    }, {
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
    await ElMessageBox.confirm(
      '确定要删除这个邮箱吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
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

const barkAccounts = ref([]);
const newBark = reactive({ name: '', base_url: '', api_key: '' });
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

function handleBack() {
  router.push('/');
}

onMounted(() => {
  fetchUserInfo();
  fetchEmails();
  fetchCountdowns();
  fetchBarkAccounts();
  intervalId = setInterval(fetchCountdowns, 10000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<style lang="scss" scoped>
.countdown-manager {
  min-height: 100vh;
  background: #f6fafb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  .main-card {
    max-width: 1600px;
    width: 65vw;
    margin: 32px auto 0 auto;
    padding: 32px 32px 24px 32px;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.08);
    border-radius: 16px;
    background: #fff;
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 20px;
      font-weight: 600;
      .add-btn {
        float: right;
      }
    }
    .main-table {
      margin-top: 18px;
    }
    .usage-tip-card {
      background: #e6f7ff;
      border: 1px solid #b6e0fe;
      border-radius: 8px;
      box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
      padding: 18px 24px 16px 24px;
      margin-top: 32px;
      .usage-title {
        display: flex;
        align-items: center;
        font-size: 18px;
        font-weight: bold;
        color: #096dd9;
        margin-bottom: 10px;
        i {
          font-size: 22px;
          margin-right: 8px;
        }
      }
      .usage-list {
        margin: 0 0 0 18px;
        padding: 0;
        font-size: 15px;
        line-height: 1.7;
        color: #333;
        li {
          margin-bottom: 2px;
          list-style: disc;
        }
      }
    }
  }
}
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  .el-button {
    padding: 10px;
    min-width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.repeat-interval-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.el-form-item__content) {
  flex: 1 1 auto;
  width: 100%;
}

:deep(.el-input),
:deep(.el-textarea),
:deep(.el-select),
:deep(.el-date-editor),
:deep(.el-input-number) {
  width: 100%;
}

.repeat-interval-row {
  display: flex;
  align-items: center;
  gap: 12px;
  > .el-input-number {
    width: 100px;
    flex-shrink: 0;
  }
  > .el-select {
    width: 120px;
    flex-shrink: 0;
  }
}
</style>

<style scoped>
.usage-tip .el-alert {
  background: #e6f7ff !important;
  color: #222 !important;
  border-radius: 8px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  border: 1px solid #b6e0fe !important;
}
.usage-tip .el-alert__title {
  color: #096dd9 !important;
  font-weight: bold;
}
.usage-tip .el-alert__description {
  color: #333 !important;
}
</style> 