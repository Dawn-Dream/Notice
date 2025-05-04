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
git clone https://github.com/Dawn-Dream/Notice
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
- 移动端适配：完整支持移动设备访问和操作
  - 响应式布局设计
  - 移动端专属导航菜单
  - 触屏友好的操作界面

---

## 依赖说明
- 前端：Vue3、Element Plus、axios、vite
- 后端：Node.js、Express、sqlite3、bcrypt、jsonwebtoken、nodemailer
- 根目录：concurrently（用于一键启动）

---

## SMTP 配置说明

系统支持两种 SMTP 配置来源：环境变量配置和数据库配置。

### 1. 环境变量配置（推荐用于生产环境）
在 backend 目录下创建 .env 文件，配置以下环境变量：

```env
# SMTP邮箱配置
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-password-or-token
SMTP_FROM_NAME=倒计时提醒助手

# JWT配置
JWT_SECRET=your-jwt-secret-key

# 服务器配置
PORT=3000
```

### 2. 数据库配置（推荐用于开发环境）
- 可在管理员后台的系统设置中配置
- 支持在线测试配置是否正确
- 可随时切换配置来源

### 3. 配置优先级和自动切换机制
1. 默认优先使用环境变量配置
2. 如果环境变量配置不完整，系统会自动切换到数据库配置
3. 管理员可以在后台手动切换配置来源
4. 系统会在界面上清晰显示当前实际使用的配置来源

### 4. 常见邮箱 SMTP 配置参考

1. **QQ邮箱**
   - 服务器：smtp.qq.com
   - 端口：465
   - 安全连接：是
   - 授权码：在QQ邮箱设置 -> 账户 -> POP3/SMTP服务中获取

2. **163邮箱**
   - 服务器：smtp.163.com
   - 端口：465
   - 安全连接：是
   - 授权码：在163邮箱设置 -> POP3/SMTP/IMAP中获取

3. **Gmail**
   - 服务器：smtp.gmail.com
   - 端口：587
   - 安全连接：否
   - 密码：需要在Google账户设置中生成应用专用密码

4. **Outlook**
   - 服务器：smtp.office365.com
   - 端口：587
   - 安全连接：否
   - 密码：使用Microsoft账户密码

注意：请将 .env 文件添加到 .gitignore 中，避免敏感信息泄露。

---

## 常见问题
1. **端口冲突**：如3000/5174端口被占用，请在`backend/index.js`或`frontend/vite.config.js`中修改端口。
2. **数据库初始化失败**：请确保`backend/data.db`有写权限，或删除后重新运行`db-init.js`。
3. **邮件发送失败**：
   - 检查`.env`文件中的SMTP配置是否正确
   - 确认使用的是授权码而不是邮箱密码（大多数邮箱服务商要求）
   - 检查后台显示的实际配置来源是否符合预期
   - 使用后台的"测试配置"功能验证配置是否正确
4. **接口404/500**：请确保前后端都已正确启动，且接口路径一致。

---

## 其他说明
- 管理员账号默认在数据库初始化时创建（可在`db-init.js`中修改）。
- 所有密码均加密存储。
- 支持自定义倒计时提醒内容和周期。
- SMTP配置支持实时切换和在线测试。

---

## Docker 部署与使用

### 拉取镜像
```bash
docker pull lycohana/notice:latest
```

### 运行容器（推荐挂载 data 目录，自动初始化数据库）
```bash
docker run -d \
  -p 3000:3000 \
  -v $PWD/backend/data:/app/data \
  -e SMTP_HOST=smtp.163.com \
  -e SMTP_PORT=465 \
  -e SMTP_USER=xxx@xxx.com \
  -e SMTP_PASS=xxxxxx \
  -e SMTP_SECURE=true \
  -e SMTP_FROM_NAME=倒计时提醒助手 \
  -e PORT=3000 \
  lycohana/notice:latest
```
- 访问前端和后端：http://localhost:3000
- 数据库存储在本地 backend/data 目录（挂载到容器 /app/data），数据库文件为 data.db。
- **首次运行无需手动准备 data.db，容器会自动初始化数据库文件。**
- 所有 SMTP 配置均可通过环境变量传入。

### 主要环境变量说明
| 变量名           | 说明             | 示例                  |
|------------------|------------------|-----------------------|
| SMTP_HOST        | SMTP服务器地址   | smtp.163.com          |
| SMTP_PORT        | SMTP端口         | 465                   |
| SMTP_USER        | 邮箱账号         | dawndream2020@163.com |
| SMTP_PASS        | 邮箱密码/授权码  | xxxxxxxx              |
| SMTP_SECURE      | 是否SSL          | true                  |
| SMTP_FROM_NAME   | 发件人名称       | 倒计时提醒助手        |
| PORT             | 后端服务端口     | 3000                  |

---

## Bark 推送说明

系统支持通过 [Bark](https://github.com/Finb/Bark) iOS App 推送通知到你的 iPhone。

### 主要特性
- 每个用户可添加多个 Bark 账户（baseUrl + API Key）
- 倒计时任务可选择用哪个 Bark 账户推送通知
- 邮件和 Bark 推送可同时进行，互不影响

### 前端使用指引
1. 在"通知邮箱管理"区域下方，管理你的 Bark 账户（添加/删除/查看）
   - 备注/名称：自定义区分不同设备或用途
   - BaseUrl：Bark 服务器地址（如 https://api.day.app 或自建）
   - API Key：Bark App 里的设备密钥
2. 新建/编辑倒计时时，可选择一个 Bark 账户进行推送（可不选）
3. 到期时，系统会自动用所选 Bark 账户推送通知到你的 iOS 设备

### 后端API说明
- `GET /api/user/bark-accounts` 获取当前用户所有 Bark 账户
- `POST /api/user/bark-accounts` 新增 Bark 账户（name, base_url, api_key）
- `DELETE /api/user/bark-accounts/:id` 删除 Bark 账户
- 倒计时相关API支持 bark_account_id 字段

### 依赖说明
- 后端依赖 [@thiskyhan/bark.js](https://www.npmjs.com/package/@thiskyhan/bark.js) 进行推送
- 数据库存储 Bark 账户信息，安全可靠

### 参考
- [Bark 官方文档](https://github.com/Finb/Bark)
- [bark.js 文档](https://github.com/chimpdev/bark.js)

---

## 更新日志

### 2025-05-05
- 新增移动端界面支持
  - 添加移动端专属导航菜单
  - 优化移动端倒计时管理界面
  - 适配移动端管理后台操作
  - 改进移动端交互体验
- 优化了倒计时状态显示
  - 根据时间差自动选择合适的单位（分钟/小时/天）
  - 状态标签使用不同颜色区分（红色表示即将到期，绿色表示已完成等）
  - 简化了状态文本显示
- 改进了表单验证和提交逻辑
  - 简化了必填字段，只保留标题、时间和通知邮箱
  - 提醒内容为空时自动使用标题
  - 优化了错误提示信息
- 数据库结构优化
  - 新增Bark推送相关字段
  - 改进了外键约束
  - 优化了默认值处理

如有更多问题或建议，欢迎 issue 或 PR！ 
