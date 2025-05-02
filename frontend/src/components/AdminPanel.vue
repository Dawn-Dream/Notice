<template>
  <div class="admin-panel">
    <div class="panel-header">
      <el-page-header @back="$emit('back')" :title="'返回'" content="管理后台" />
      <el-tabs v-model="activeTab" class="header-tabs">
        <el-tab-pane label="用户管理" name="users" />
        <el-tab-pane label="倒计时管理" name="countdowns" />
        <el-tab-pane label="系统设置" name="settings" />
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

      <div v-else-if="activeTab === 'countdowns'">
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

      <div v-else>
        <!-- SMTP配置表单 -->
        <el-card class="smtp-config">
          <template #header>
            <div class="card-header">
              <span>SMTP服务器配置</span>
              <div>
                <el-tag 
                  :type="serverConfigSource ? 'success' : 'info'" 
                  class="config-source-tag"
                >
                  服务器当前使用{{ serverConfigSource ? '环境变量' : '数据库' }}配置
                </el-tag>
                <el-button type="primary" @click="testSmtp" :loading="testing">
                  测试配置
                </el-button>
                <el-button type="success" @click="saveConfig" :loading="saving">
                  保存配置
                </el-button>
              </div>
            </div>
          </template>
          
          <el-form :model="smtpConfig" label-width="120px" :rules="smtpRules" ref="smtpFormRef">
            <el-form-item label="配置来源" prop="use_env_config">
              <el-radio-group v-model="smtpConfig.use_env_config" @change="handleConfigSourceChange">
                <el-radio :label="1">使用环境变量</el-radio>
                <el-radio :label="0">使用数据库</el-radio>
              </el-radio-group>
              <el-tooltip content="环境变量配置优先级更高，适合生产环境；数据库配置方便调试" placement="top">
                <el-icon class="config-help"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-form-item>

            <template v-if="smtpConfig.use_env_config">
              <el-alert
                title="使用环境变量配置"
                type="info"
                description="当前使用服务器环境变量中的SMTP配置，如需修改请编辑服务器的环境变量文件。"
                show-icon
                :closable="false"
                style="margin-bottom: 20px;"
              />
            </template>
            
            <template v-else>
              <el-form-item label="SMTP服务器" prop="host">
                <el-input 
                  v-model="smtpConfig.host" 
                  name="host"
                  placeholder="例如：smtp.gmail.com"
                >
                  <template #append>
                    <el-tooltip content="常见SMTP服务器配置参考" placement="top">
                      <el-button @click="showSmtpHelp">
                        <el-icon><QuestionFilled /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </template>
                </el-input>
              </el-form-item>
              
              <el-form-item label="端口" prop="port">
                <el-input 
                  v-model="smtpConfig.port" 
                  name="port"
                  placeholder="例如：587"
                >
                  <template #append>
                    <el-select 
                      v-model="smtpConfig.port" 
                      style="width: 100px"
                    >
                      <el-option label="25 (SMTP)" value="25" />
                      <el-option label="465 (SMTPS)" value="465" />
                      <el-option label="587 (STARTTLS)" value="587" />
                    </el-select>
                  </template>
                </el-input>
              </el-form-item>
              
              <el-form-item label="安全连接" prop="secure">
                <el-switch 
                  v-model="smtpConfig.secure" 
                  name="secure"
                />
                <span class="form-tip">
                  端口465通常需要启用，端口587通常不需要
                </span>
              </el-form-item>
              
              <el-form-item label="用户名" prop="username">
                <el-input 
                  v-model="smtpConfig.username" 
                  name="username"
                  placeholder="完整邮箱地址"
                />
              </el-form-item>
              
              <el-form-item label="密码" prop="password">
                <el-input 
                  v-model="smtpConfig.password" 
                  name="password"
                  type="password" 
                  placeholder="密码或授权码" 
                  show-password
                >
                  <template #append>
                    <el-tooltip content="如何获取授权码？" placement="top">
                      <el-button @click="showAuthHelp">
                        <el-icon><QuestionFilled /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </template>
                </el-input>
              </el-form-item>
              
              <el-form-item label="发件人名称" prop="from_name">
                <el-input 
                  v-model="smtpConfig.from_name" 
                  name="from_name"
                  placeholder="显示的发件人名称"
                />
              </el-form-item>
            </template>
          </el-form>
        </el-card>
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
import { Plus, Delete, Message, Key, QuestionFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const props = defineProps({
  token: String
});

const activeTab = ref('users');
const users = ref([]);
const countdowns = ref([]);
const showAddUserDialog = ref(false);
const saving = ref(false);
const testing = ref(false);
const isEnvConfig = ref(false);

const newUser = ref({
  username: '',
  password: '',
  email: '',
  is_admin: 0
});

const smtpConfig = ref({
  host: '',
  port: '587',
  secure: false,
  username: '',
  password: '',
  from_name: '倒计时提醒助手',
  use_env_config: 1
});

// 添加新的状态来跟踪服务器实际使用的配置来源
const serverConfigSource = ref(1); // 默认使用环境变量

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

const smtpRules = {
  host: [{ required: true, message: '请输入SMTP服务器地址', trigger: 'blur', if: form => !form.use_env_config }],
  port: [{ required: true, message: '请输入端口号', trigger: 'blur', if: form => !form.use_env_config }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur', if: form => !form.use_env_config }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur', if: form => !form.use_env_config }],
  from_name: [{ required: true, message: '请输入发件人名称', trigger: 'blur', if: form => !form.use_env_config }]
};

const addUserFormRef = ref(null);
const smtpFormRef = ref(null);

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

// 加载SMTP配置
async function loadConfig() {
  try {
    const response = await fetch('/api/admin/smtp', {
      headers: { 
        'Authorization': `Bearer ${props.token}`
      }
    });
    const data = await response.json();
    if (data) {
      // 更新服务器实际使用的配置来源
      serverConfigSource.value = data.use_env_config;

      // 检查环境变量配置是否完整
      if (data.use_env_config && (!data.host || !data.username)) {
        ElMessage.warning('环境变量配置不完整，已自动切换到数据库配置');
        data.use_env_config = 0;
      }

      smtpConfig.value = {
        host: data.host || '',
        port: data.port || '465',
        secure: data.secure ?? true,
        username: data.username || '',
        password: '', // 出于安全考虑，不显示已保存的密码
        from_name: data.from_name || '',
        use_env_config: Number(data.use_env_config)
      };
      console.log('Loaded config:', { ...smtpConfig.value, password: '***' }); // 添加调试日志
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    ElMessage.error('加载配置失败：' + (error.response?.data?.msg || error.message));
  }
}

// 处理配置来源切换
async function handleConfigSourceChange(value) {
  console.log('Config source changed to:', value); // 添加调试日志
  
  if (value === 1) {
    // 切换到环境变量配置
    try {
      const response = await fetch('/api/admin/smtp', {
        headers: { 
          'Authorization': `Bearer ${props.token}`
        }
      });
      const data = await response.json();
      if (!data || !data.host || !data.username) {
        ElMessage.error('环境变量配置不完整，无法切换');
        smtpConfig.value.use_env_config = 0;
        return;
      }
      // 加载环境变量配置
      Object.assign(smtpConfig.value, {
        host: data.host || '',
        port: data.port || '465',
        secure: data.secure ?? true,
        username: data.username || '',
        password: '', // 出于安全考虑，不显示密码
        from_name: data.from_name || '',
        use_env_config: 1
      });
      
      // 禁用相关表单项
      if (smtpFormRef.value) {
        const formItems = smtpFormRef.value.$el.querySelectorAll('.el-form-item');
        ['host', 'port', 'secure', 'username', 'password'].forEach(field => {
          const formItem = Array.from(formItems).find(item => 
            item.querySelector(`[name="${field}"]`) || 
            item.querySelector(`[data-field="${field}"]`)
          );
          if (formItem) {
            const input = formItem.querySelector('input, select');
            if (input) {
              input.disabled = true;
            }
          }
        });
      }
    } catch (error) {
      console.error('获取环境变量配置失败:', error);
      ElMessage.error('获取环境变量配置失败，请检查服务器配置');
      smtpConfig.value.use_env_config = 0;
    }
  } else {
    // 切换到数据库配置
    // 启用所有表单项
    if (smtpFormRef.value) {
      const formItems = smtpFormRef.value.$el.querySelectorAll('.el-form-item');
      ['host', 'port', 'secure', 'username', 'password'].forEach(field => {
        const formItem = Array.from(formItems).find(item => 
          item.querySelector(`[name="${field}"]`) || 
          item.querySelector(`[data-field="${field}"]`)
        );
        if (formItem) {
          const input = formItem.querySelector('input, select');
          if (input) {
            input.disabled = false;
          }
        }
      });
    }
  }
}

// 保存SMTP配置
async function saveConfig() {
  if (!smtpFormRef.value) return;
  
  try {
    if (!smtpConfig.value.use_env_config) {
      await smtpFormRef.value.validate();
    }
    saving.value = true;
    
    // 根据配置来源准备保存数据
    const dataToSave = smtpConfig.value.use_env_config ? {
      use_env_config: 1,
      from_name: smtpConfig.value.from_name
    } : {
      host: smtpConfig.value.host,
      port: smtpConfig.value.port,
      secure: smtpConfig.value.secure,
      username: smtpConfig.value.username,
      password: smtpConfig.value.password || undefined, // 如果密码为空，则不更新
      from_name: smtpConfig.value.from_name,
      use_env_config: 0
    };

    const response = await fetch('/api/admin/smtp', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.token}`
      },
      body: JSON.stringify(dataToSave)
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success(data.msg || '保存成功');
      await loadConfig(); // 重新加载配置
    } else {
      ElMessage.error(data.msg || '保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败：' + (error.response?.data?.msg || error.message));
  } finally {
    saving.value = false;
  }
}

// 测试SMTP配置
async function testSmtp() {
  if (!smtpFormRef.value) return;
  
  try {
    await smtpFormRef.value.validate();
  } catch (error) {
    return;
  }
  
  // 如果使用数据库配置，先保存当前配置
  if (!smtpConfig.value.use_env_config) {
    try {
      const saveResponse = await fetch('/api/admin/smtp', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${props.token}`
        },
        body: JSON.stringify({
          ...smtpConfig.value,
          use_env_config: 0
        })
      });
      
      const saveData = await saveResponse.json();
      if (!saveData.success) {
        ElMessage.error('保存配置失败：' + saveData.msg);
        return;
      }
    } catch (error) {
      ElMessage.error('保存配置失败：' + error.message);
      return;
    }
  }
  
  // 弹窗输入测试邮箱
  try {
    const { value: email } = await ElMessageBox.prompt('请输入测试邮箱地址', '发送测试邮件', {
      confirmButtonText: '发送',
      cancelButtonText: '取消',
      inputPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      inputErrorMessage: '请输入正确的邮箱地址'
    });
    
    if (email) {
      testing.value = true;
      try {
        const response = await fetch('/api/admin/smtp/test', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.token}`
          },
          body: JSON.stringify({ test_email: email })
        });
        
        const data = await response.json();
        if (data.success) {
          ElMessage.success(data.msg || '测试邮件发送成功');
        } else {
          ElMessage.error(data.msg || '测试失败');
        }
      } catch (error) {
        ElMessage.error('测试失败：' + error.message);
      } finally {
        testing.value = false;
      }
    }
  } catch {
    // 用户取消输入
  }
}

// 显示SMTP帮助
function showSmtpHelp() {
  ElMessageBox.alert(`
    常见邮箱SMTP配置：
    
    1. Gmail
    - 服务器：smtp.gmail.com
    - 端口：587
    - 安全连接：否
    
    2. QQ邮箱
    - 服务器：smtp.qq.com
    - 端口：465
    - 安全连接：是
    
    3. 163邮箱
    - 服务器：smtp.163.com
    - 端口：465
    - 安全连接：是
    
    4. Outlook/Hotmail
    - 服务器：smtp.office365.com
    - 端口：587
    - 安全连接：否
  `.trim(), 'SMTP服务器配置参考');
}

// 显示授权码帮助
function showAuthHelp() {
  ElMessageBox.alert(`
    大多数邮箱服务商出于安全考虑，都需要使用授权码而不是密码来发送邮件：
    
    1. QQ邮箱
    - 设置 -> 账户 -> POP3/SMTP服务 -> 开启 -> 生成授权码
    
    2. Gmail
    - Google账户设置 -> 安全性 -> 2步验证 -> 应用专用密码
    
    3. 163邮箱
    - 设置 -> POP3/SMTP/IMAP -> 开启 -> 授权码
    
    4. Outlook
    - 需要使用Microsoft账户密码
  `.trim(), '如何获取授权码？');
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
        inputValidator: value => value.length >= 6,
        inputErrorMessage: '密码长度不能小于6位'
      }
    );
    
    if (newPassword) {
      await axios.post(`/api/admin/users/${user.id}/reset`, { new_password: newPassword }, {
        headers: { Authorization: `Bearer ${props.token}` }
      });
      ElMessage.success('密码重置成功');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密码重置失败');
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
        inputValue: user.email,
        inputPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        inputErrorMessage: '请输入正确的邮箱地址'
      }
    );
    
    if (newEmail) {
      await axios.put(`/api/admin/users/${user.id}/email`, { email: newEmail }, {
        headers: { Authorization: `Bearer ${props.token}` }
      });
      ElMessage.success('邮箱修改成功');
      fetchUsers();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('邮箱修改失败');
    }
  }
}

// 删除用户
async function handleDeleteUser(user) {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户"${user.username}"吗？`,
      '删除用户',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`/api/admin/users/${user.id}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    });
    ElMessage.success('删除成功');
    fetchUsers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

// 删除倒计时
async function handleDeleteCountdown(countdown) {
  try {
    await ElMessageBox.confirm(
      `确定要删除倒计时"${countdown.title}"吗？`,
      '删除倒计时',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`/api/admin/timers/${countdown.id}`, {
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

onMounted(() => {
  fetchUsers();
  fetchCountdowns();
  loadConfig();
});
</script>

<style lang="scss" scoped>
.admin-panel {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  
  .panel-header {
    margin-bottom: 20px;
  }
  
  .header-tabs {
    margin-top: 20px;
  }
  
  .action-bar {
    margin-bottom: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .action-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  
  .action-button {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .smtp-config {
    max-width: 800px;
    margin: 20px auto;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .form-tip {
    margin-left: 10px;
    color: #909399;
    font-size: 13px;
  }

  .config-help {
    margin-left: 8px;
    color: #909399;
    cursor: pointer;
  }

  .config-source-tag {
    margin-right: 10px;
  }
}
</style>