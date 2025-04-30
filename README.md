# Notice 项目总览

## 项目简介
Notice 是一个基于 Node.js + Vue3 + Element Plus 的倒计时定时邮件通知系统，支持用户注册、登录、倒计时管理、邮件提醒、管理员后台等功能。

---

## 目录结构
```
├── backend/         # 后端 Node.js (Express + sqlite3)
├── frontend/        # 前端 Vue3 + Element Plus
├── README.md        # 项目说明文档
├── package.json     # 根目录一键启动配置
```

---

## 快速启动

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd nasNotice
```

### 2. 安装依赖
```bash
cd backend && npm install
cd ../frontend && npm install
cd .. && npm install   # 安装根目录依赖（concurrently）
```

### 3. 一键启动前后端（推荐）
```bash
npm run dev
```
- 前端会自动启动（默认端口5174），后端会自动启动（默认端口3000）
- 你可以直接访问：http://localhost:5174

### 4. 分别手动启动
如需单独启动：
```bash
cd backend && node db-init.js   # 初始化数据库（首次运行）
cd backend && npm start         # 启动后端服务
cd frontend && npm run dev      # 启动前端服务
```

---

## 主要功能
- 用户注册/登录/登出
- 管理员后台：用户管理、倒计时管理、重置密码、修改邮箱
- 普通用户：倒计时任务管理、通知邮箱管理
- 邮件定时提醒
- 支持周期性提醒

---

## 依赖说明
- 前端：Vue3、Element Plus、axios、vite
- 后端：Node.js、Express、sqlite3、bcrypt、jsonwebtoken、nodemailer
- 根目录：concurrently（用于一键启动）

---

## 环境变量配置
在 backend 目录下创建 .env 文件，配置以下环境变量：

```env
# SMTP邮箱配置
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-password-or-token

# JWT配置
JWT_SECRET=your-jwt-secret-key

# 服务器配置
PORT=3000
```

### 环境变量说明
1. **SMTP配置**
   - SMTP_HOST：邮件服务器地址（如：smtp.163.com, smtp.gmail.com）
   - SMTP_PORT：邮件服务器端口（通常SSL为465，非SSL为587）
   - SMTP_SECURE：是否使用SSL（true/false）
   - SMTP_USER：发件邮箱账号
   - SMTP_PASS：邮箱授权码或密码

2. **JWT配置**
   - JWT_SECRET：用于生成JWT token的密钥，请设置一个复杂的随机字符串

3. **服务器配置**
   - PORT：后端服务器端口号，默认3000
   - API_PROXY：后端API（=http://localhost:3000）
    



注意：请将 .env 文件添加到 .gitignore 中，避免敏感信息泄露。

---

## 常见问题
1. **端口冲突**：如3000/5174端口被占用，请在`backend/index.js`或`frontend/vite.config.js`中修改端口。
2. **数据库初始化失败**：请确保`backend/data.db`有写权限，或删除后重新运行`db-init.js`。
3. **邮件发送失败**：请检查`.env`文件中的SMTP配置是否正确。
4. **接口404/500**：请确保前后端都已正确启动，且接口路径一致。

---

## 其他说明
- 管理员账号默认在数据库初始化时创建（可在`db-init.js`中修改）。
- 所有密码均加密存储。
- 支持自定义倒计时提醒内容和周期。

---

如有更多问题或建议，欢迎 issue 或 PR！ 
