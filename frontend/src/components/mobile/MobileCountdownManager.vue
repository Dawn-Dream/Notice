<template>
  <div class="mobile-countdown-manager">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span>倒计时管理</span>
          <el-button type="primary" @click="dialogVisible = true" size="small">
            <el-icon><Plus /></el-icon>
            添加
          </el-button>
        </div>
      </template>

      <el-table
        :data="countdowns"
        style="width: 100%"
        v-loading="loading"
        empty-text="这里空空如也哟"
        size="small"
      >
        <el-table-column prop="title" label="标题" min-width="120" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ formatStatus(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column width="90" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button
                type="primary"
                :icon="Edit"
                circle
                size="small"
                @click="editCountdown(scope.row)"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="handleDelete(scope.row)"
              />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑倒计时对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑倒计时' : '添加倒计时'"
      width="95%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        size="large"
      >
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :value="'once'">单次</el-radio>
            <el-radio :value="'cycle'">周期</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        
        <el-form-item label="内容" prop="email_content">
          <el-input
            v-model="form.email_content"
            type="textarea"
            :rows="3"
            placeholder="不填则使用标题作为内容"
          />
        </el-form-item>
        
        <el-form-item v-if="form.type === 'once'" label="截止时间" prop="target_time">
          <el-date-picker
            v-model="form.target_time"
            type="datetime"
            placeholder="选择截止时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </el-form-item>

        <template v-else>
          <el-form-item label="首次时间" prop="target_time">
            <el-date-picker
              v-model="form.target_time"
              type="datetime"
              placeholder="选择首次提醒时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="重复间隔" prop="repeat_value">
            <div class="repeat-interval-row">
              <el-input-number
                v-model="form.repeat_value"
                :min="1"
                style="width: 120px"
                controls-position="right"
              />
              <el-select
                v-model="form.repeat_unit"
                style="flex: 1"
              >
                <el-option label="分钟" value="minute" />
                <el-option label="小时" value="hour" />
                <el-option label="天" value="day" />
                <el-option label="月" value="month" />
                <el-option label="年" value="year" />
              </el-select>
            </div>
          </el-form-item>
          
          <el-form-item label="终止时间" prop="repeat_until">
            <el-date-picker
              v-model="form.repeat_until"
              type="datetime"
              placeholder="选择周期终止时间（可选）"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              style="width: 100%"
            />
          </el-form-item>
        </template>
        
        <el-form-item label="通知邮箱" prop="notify_email">
          <el-select v-model="form.notify_email" style="width: 100%" clearable placeholder="不推送邮箱通知">
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

        <el-form-item label="Bark账户" prop="bark_account_id">
          <el-select v-model="form.bark_account_id" clearable placeholder="不推送Bark" style="width: 100%">
            <el-option 
              v-for="b in barkAccounts" 
              :key="b.id" 
              :label="b.name + ' - ' + b.base_url" 
              :value="b.id" 
            />
          </el-select>
        </el-form-item>

        <el-collapse v-model="activeNames">
          <el-collapse-item title="Bark高级设置" name="bark">
            <el-form-item label="推送标题">
              <el-input v-model="form.bark_title" placeholder="不填则默认倒计时标题" />
            </el-form-item>
            <el-form-item label="推送内容">
              <el-input v-model="form.bark_body" placeholder="不填则默认提醒内容" />
            </el-form-item>
            <el-form-item label="分组">
              <el-input v-model="form.bark_group" placeholder="如：工作/生活/自定义" />
            </el-form-item>
            <el-form-item label="铃声">
              <el-select v-model="form.bark_sound" clearable placeholder="默认" style="width: 100%">
                <el-option label="默认" value="" />
                <el-option label="alarm" value="alarm" />
                <el-option label="bell" value="bell" />
                <el-option label="birdsong" value="birdsong" />
                <el-option label="calypso" value="calypso" />
                <el-option label="glass" value="glass" />
                <el-option label="minuet" value="minuet" />
                <el-option label="electronic" value="electronic" />
                <el-option label="anticipate" value="anticipate" />
                <el-option label="shake" value="shake" />
                <el-option label="synth" value="synth" />
                <el-option label="pulse" value="pulse" />
                <el-option label="telegraph" value="telegraph" />
                <el-option label="up" value="up" />
                <el-option label="bark" value="bark" />
              </el-select>
            </el-form-item>
            <el-form-item label="中断级别">
              <el-select v-model="form.bark_level" clearable placeholder="默认" style="width: 100%">
                <el-option label="默认" value="" />
                <el-option label="主动（active）" value="active" />
                <el-option label="时效（timeSensitive）" value="timeSensitive" />
                <el-option label="被动（passive）" value="passive" />
                <el-option label="重要警告（critical）" value="critical" />
              </el-select>
            </el-form-item>
            <el-form-item label="自动复制">
              <el-input v-model="form.bark_copy" placeholder="推送时自动复制到剪贴板" />
            </el-form-item>
            <el-form-item label="URL跳转">
              <el-input v-model="form.bark_url" placeholder="推送点击后跳转的URL" />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
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
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Delete,
  Edit,
  Plus
} from '@element-plus/icons-vue';
import axios from 'axios';

const props = defineProps({ token: String });
const loading = ref(false);
const dialogVisible = ref(false);
const formRef = ref();
const countdowns = ref([]);
const emails = ref([]);
const userInfo = ref({});
const editing = ref(false);
const editId = ref(null);
const activeNames = ref(['']);
let intervalId = null;
const barkAccounts = ref([]);

const form = reactive({
  type: 'once',
  title: '',
  email_content: '',
  target_time: '',
  repeat_value: 1,
  repeat_unit: 'day',
  repeat_until: '',
  notify_email: '',
  bark_account_id: null,
  bark_title: '',
  bark_body: '',
  bark_group: '',
  bark_sound: '',
  bark_level: '',
  bark_copy: '',
  bark_url: ''
});

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  target_time: [
    { required: true, message: '请选择目标时间', trigger: 'change' }
  ]
};

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

async function handleSubmit() {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    const data = {
      title: form.title.trim(),
      end_time: new Date(form.target_time).toISOString(),
      email_content: form.email_content?.trim() || form.title.trim(),
      repeat_type: form.type === 'cycle' ? form.repeat_unit : 'none',
      repeat_value: form.type === 'cycle' ? (form.repeat_value || 1) : 1,
      repeat_until: form.type === 'cycle' && form.repeat_until
        ? new Date(form.repeat_until).toISOString()
        : null,
      notify_email: form.notify_email, // 允许为空
      bark_account_id: form.bark_account_id || null,
      bark_title: form.bark_title?.trim() || null,
      bark_body: form.bark_body?.trim() || null,
      bark_group: form.bark_group?.trim() || null,
      bark_sound: form.bark_sound || null,
      bark_level: form.bark_level || null,
      bark_copy: form.bark_copy?.trim() || null,
      bark_url: form.bark_url?.trim() || null
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
    if (error.response?.data?.msg) {
      ElMessage.error(error.response.data.msg);
    } else if (error.message) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error('操作失败，请重试');
    }
  }
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
  form.bark_title = '';
  form.bark_body = '';
  form.bark_group = '';
  form.bark_sound = '';
  form.bark_level = '';
  form.bark_copy = '';
  form.bark_url = '';
  editing.value = false;
  editId.value = null;
  activeNames.value = [''];
}

function editCountdown(item) {
  editing.value = true;
  editId.value = item.id;
  form.title = item.title;
  form.email_content = item.email_content || '';
  form.target_time = item.end_time ? item.end_time.slice(0, 16) : '';
  form.notify_email = item.notify_email;
  form.bark_account_id = item.bark_account_id;
  form.bark_title = item.bark_title || '';
  form.bark_body = item.bark_body || '';
  form.bark_group = item.bark_group || '';
  form.bark_sound = item.bark_sound || '';
  form.bark_level = item.bark_level || '';
  form.bark_copy = item.bark_copy || '';
  form.bark_url = item.bark_url || '';
  
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

const getStatusType = (status) => {
  if (status === '已通知') return 'success';
  if (status.includes('分钟后')) return 'danger';
  if (status.includes('小时后')) return 'warning';
  if (status.includes('天后')) return 'info';
  return 'info';
};

const formatStatus = (status) => {
  return status.replace('下一次通知在', '');
};

onMounted(async () => {
  if (localStorage.getItem('token')) {
    await fetchUserInfo()
    await fetchCountdowns()
    await fetchEmails()
    await fetchBarkAccounts()
    // 启动定时刷新
    intervalId = setInterval(fetchCountdowns, 10000)
  }
})

// 添加 watch 监听 token 变化
watch(() => localStorage.getItem('token'), (newToken) => {
  if (newToken) {
    fetchUserInfo()
    fetchCountdowns()
    fetchEmails()
    fetchBarkAccounts()
    // 如果没有定时器，启动定时刷新
    if (!intervalId) {
      intervalId = setInterval(fetchCountdowns, 10000)
    }
  } else {
    // token被清除时，清除定时器
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
})
</script>

<style lang="scss" scoped>
.mobile-countdown-manager {
  padding: 10px;
  
  .main-card {
    margin-bottom: 16px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    
    :deep(.el-card__header) {
      padding: 16px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        span {
          font-size: 16px;
          font-weight: 500;
          color: var(--el-text-color-primary);
        }
        
        .el-button {
          padding: 8px 16px;
          height: 36px;
          border-radius: 18px;
          font-size: 14px;
          
          .el-icon {
            margin-right: 4px;
          }
        }
      }
    }
    
    :deep(.el-card__body) {
      padding: 16px;
      
      .el-table {
        border-radius: 8px;
        overflow: hidden;
        
        .el-table__header-wrapper {
          th {
            background-color: var(--el-fill-color-light);
            font-size: 14px;
            font-weight: 500;
            color: var(--el-text-color-regular);
            padding: 8px 0;
          }
        }
        
        .el-table__body-wrapper {
          td {
            padding: 8px 0;
            font-size: 14px;
          }
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          
          .el-button {
            padding: 6px;
            width: 28px;
            height: 28px;
            
            .el-icon {
              font-size: 14px;
            }
          }
        }
      }
    }
  }
  
  .repeat-interval-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  :deep(.el-form-item__label) {
    font-size: 14px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    font-size: 14px;
  }

  :deep(.el-collapse-item__header) {
    font-size: 14px;
  }

  :deep(.el-dialog__body) {
    padding: 10px 20px;
  }
}
</style> 