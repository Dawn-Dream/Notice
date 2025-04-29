<template>
  <div class="countdown-manager">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="email-manager">
          <template #header>
            <div class="card-header">
              <span>通知邮箱管理</span>
            </div>
          </template>
          
          <div class="main-email">
            <el-tag type="success">主邮箱：{{ userInfo.email }}</el-tag>
          </div>
          
          <el-form @submit.prevent="addEmail" class="email-form">
            <el-form-item>
              <el-input
                v-model="newEmail"
                placeholder="新邮箱"
                :prefix-icon="Message"
              >
                <template #append>
                  <el-button @click="addEmail" type="primary">
                    <el-icon><Plus /></el-icon>
                    添加
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
          
          <el-table :data="emails" style="width: 100%" empty-text="这里空空如也哟">
            <el-table-column prop="email" label="邮箱地址" />
            <el-table-column align="right" width="80">
              <template #default="scope">
                <el-button
                  type="danger"
                  :icon="Delete"
                  circle
                  @click="delEmail(scope.row.id)"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>倒计时管理</span>
              <el-button type="primary" @click="dialogVisible = true">
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
          >
            <el-table-column prop="title" label="标题" />
            <el-table-column label="时间">
              <template #default="scope">
                {{ formatTime(scope.row.end_time) }}
              </template>
            </el-table-column>
            <el-table-column  align="center" label="周期" >
              <template #default="scope">
                <el-tag v-if="scope.row.repeat_type && scope.row.repeat_type !== 'none'" type="success">
                  每{{ scope.row.repeat_value || 1 }}{{ repeatUnitText(scope.row.repeat_type) }}
                </el-tag>
                <el-tag v-else type="info">单次</el-tag>
              </template>
            </el-table-column>
            <el-table-column  align="center" label="操作" width="100">
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Delete,
  Edit,
  Plus,
  Message
} from '@element-plus/icons-vue';
import axios from 'axios';

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

const form = reactive({
  type: 'once',
  title: '',
  email_content: '',
  target_time: '',
  repeat_value: 1,
  repeat_unit: 'day',
  repeat_until: '',
  notify_email: ''
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
  countdowns.value = res.data;
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
          notify_email: form.notify_email
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

onMounted(() => {
  fetchUserInfo();
  fetchEmails();
  fetchCountdowns();
});
</script>

<style lang="scss" scoped>
.countdown-manager {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .main-email {
    margin-bottom: 20px;
  }
  
  .email-form {
    margin-bottom: 20px;
  }
  
  .el-table {
    margin-top: 20px;
  }
}

.dialog-footer {
  padding: 20px 0 0;
  text-align: right;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0px;
  .el-button {
    padding:  10px;
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