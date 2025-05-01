<template>
  <div class="system-settings">
    <h2>系统设置</h2>
    
    <!-- SMTP配置表单 -->
    <el-card class="smtp-config">
      <template #header>
        <div class="card-header">
          <span>SMTP服务器配置</span>
          <div>
            <el-button type="primary" @click="testSmtp" :loading="testing">
              测试配置
            </el-button>
            <el-button type="success" @click="saveConfig" :loading="saving">
              保存配置
            </el-button>
          </div>
        </div>
      </template>
      
      <el-form :model="smtpConfig" label-width="120px" :rules="rules" ref="formRef">
        <el-form-item label="SMTP服务器" prop="host">
          <el-input v-model="smtpConfig.host" placeholder="例如：smtp.gmail.com">
            <template #append>
              <el-tooltip content="常见SMTP服务器配置参考" placement="top">
                <el-button @click="showSmtpHelp">
                  <el-icon><Question /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="端口" prop="port">
          <el-input v-model="smtpConfig.port" placeholder="例如：587">
            <template #append>
              <el-select v-model="smtpConfig.port" style="width: 100px">
                <el-option label="25 (SMTP)" value="25" />
                <el-option label="465 (SMTPS)" value="465" />
                <el-option label="587 (STARTTLS)" value="587" />
              </el-select>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="安全连接" prop="secure">
          <el-switch v-model="smtpConfig.secure" />
          <span class="form-tip">
            端口465通常需要启用，端口587通常不需要
          </span>
        </el-form-item>
        
        <el-form-item label="用户名" prop="username">
          <el-input v-model="smtpConfig.username" placeholder="完整邮箱地址" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input v-model="smtpConfig.password" type="password" placeholder="密码或授权码" show-password>
            <template #append>
              <el-tooltip content="如何获取授权码？" placement="top">
                <el-button @click="showAuthHelp">
                  <el-icon><Question /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="发件人名称" prop="from_name">
          <el-input v-model="smtpConfig.from_name" placeholder="显示的发件人名称" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Question } from '@element-plus/icons-vue'
import axios from 'axios'

const formRef = ref(null)
const saving = ref(false)
const testing = ref(false)

const smtpConfig = ref({
  host: '',
  port: '587',
  secure: false,
  username: '',
  password: '',
  from_name: '倒计时提醒助手'
})

const rules = {
  host: [{ required: true, message: '请输入SMTP服务器地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口号', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  from_name: [{ required: true, message: '请输入发件人名称', trigger: 'blur' }]
}

// 加载配置
async function loadConfig() {
  try {
    const { data } = await axios.get('/api/admin/smtp')
    if (data) {
      smtpConfig.value = {
        ...data,
        secure: Boolean(data.secure),
        password: '' // 出于安全考虑，不显示已保存的密码
      }
    }
  } catch (error) {
    ElMessage.error('加载配置失败：' + (error.response?.data?.msg || error.message))
  }
}

// 保存配置
async function saveConfig() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }
  
  saving.value = true
  try {
    const { data } = await axios.put('/api/admin/smtp', smtpConfig.value)
    ElMessage.success(data.msg || '保存成功')
  } catch (error) {
    ElMessage.error('保存失败：' + (error.response?.data?.msg || error.message))
  } finally {
    saving.value = false
  }
}

// 测试配置
async function testSmtp() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }
  
  // 先保存配置
  try {
    await axios.put('/api/admin/smtp', smtpConfig.value)
  } catch (error) {
    ElMessage.error('保存配置失败：' + (error.response?.data?.msg || error.message))
    return
  }
  
  // 弹窗输入测试邮箱
  try {
    const { value: email } = await ElMessageBox.prompt('请输入测试邮箱地址', '发送测试邮件', {
      confirmButtonText: '发送',
      cancelButtonText: '取消',
      inputPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      inputErrorMessage: '请输入正确的邮箱地址'
    })
    
    if (email) {
      testing.value = true
      try {
        const { data } = await axios.post('/api/admin/smtp/test', { test_email: email })
        ElMessage.success(data.msg || '测试邮件发送成功')
      } catch (error) {
        ElMessage.error('测试失败：' + (error.response?.data?.msg || error.message))
      } finally {
        testing.value = false
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
  `.trim(), 'SMTP服务器配置参考')
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
  `.trim(), '如何获取授权码？')
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.system-settings {
  padding: 20px;
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
</style> 