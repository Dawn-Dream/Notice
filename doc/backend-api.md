# API 文档

基于提取的API接口信息，以下是完整的API文档：

## 1. 用户认证相关API

### 1.1 用户注册
- **路径**: POST `/api/register`
- **功能**: 用户注册
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| username | string | 是 | 用户名 |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |

- **响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "userId": 123
}
```

### 1.2 用户登录
- **路径**: POST `/api/login`
- **功能**: 用户登录
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

- **响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "testuser",
    "is_admin": false
  }
}
```

### 1.3 获取当前用户信息
- **路径**: GET `/api/user`
- **功能**: 获取当前登录用户信息
- **响应示例**:
```json
{
  "id": 123,
  "username": "testuser",
  "email": "test@example.com",
  "is_admin": false
}
```

### 1.4 修改密码
- **路径**: POST `/api/user/change-password`
- **功能**: 修改当前用户密码
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| old_password | string | 是 | 旧密码 |
| new_password | string | 是 | 新密码 |

- **响应示例**:
```json
{
  "msg": "密码修改成功"
}
```

## 2. 倒计时管理API

### 2.1 创建倒计时
- **路径**: POST `/api/timers`
- **功能**: 创建新的倒计时
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| title | string | 是 | 倒计时标题 |
| end_time | string | 是 | 结束时间(ISO格式) |
| email_content | string | 否 | 邮件内容 |
| repeat_type | string | 否 | 重复类型 |
| repeat_until | string | 否 | 重复截止时间 |
| repeat_value | number | 否 | 重复值 |
| notify_email | string | 否 | 通知邮箱 |
| bark_account_id | number | 否 | Bark账户ID |
| bark_title | string | 否 | Bark通知标题 |
| bark_body | string | 否 | Bark通知内容 |
| bark_group | string | 否 | Bark通知分组 |
| bark_sound | string | 否 | Bark通知声音 |
| bark_level | string | 否 | Bark通知级别 |
| bark_copy | string | 否 | Bark复制内容 |
| bark_url | string | 否 | Bark跳转URL |

- **响应示例**:
```json
{
  "success": true,
  "message": "倒计时创建成功",
  "timerId": 456
}
```

### 2.2 获取用户倒计时列表
- **路径**: GET `/api/timers`
- **功能**: 获取当前用户的所有倒计时
- **响应示例**:
```json
[
  {
    "id": 456,
    "title": "项目截止",
    "end_time": "2023-12-31T23:59:59Z",
    "email_content": "项目即将截止，请尽快完成",
    "repeat_type": "weekly",
    "notify_email": "user@example.com"
  }
]
```

### 2.3 删除倒计时
- **路径**: DELETE `/api/timers/:id`
- **功能**: 删除指定倒计时
- **响应示例**:
```json
{
  "success": true,
  "message": "倒计时删除成功"
}
```

### 2.4 编辑倒计时
- **路径**: PUT `/api/timers/:id`
- **功能**: 更新倒计时信息
- **请求参数**: 同创建倒计时
- **响应示例**:
```json
{
  "success": true,
  "message": "倒计时更新成功"
}
```

## 3. 邮箱管理API

### 3.1 获取邮箱列表
- **路径**: GET `/api/user/emails`
- **功能**: 获取用户绑定的邮箱列表
- **响应示例**:
```json
[
  {
    "id": 1,
    "email": "user1@example.com"
  },
  {
    "id": 2,
    "email": "user2@example.com"
  }
]
```

### 3.2 添加邮箱
- **路径**: POST `/api/user/emails`
- **功能**: 添加用户邮箱
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| email | string | 是 | 邮箱地址 |

- **响应示例**:
```json
{
  "success": true,
  "message": "邮箱添加成功"
}
```

### 3.3 删除邮箱
- **路径**: DELETE `/api/user/emails/:id`
- **功能**: 删除用户邮箱
- **响应示例**:
```json
{
  "success": true,
  "message": "邮箱删除成功"
}
```

## 4. Bark账户管理API

### 4.1 获取Bark账户
- **路径**: GET `/api/user/bark-accounts`
- **功能**: 获取用户Bark账户
- **响应示例**:
```json
[
  {
    "id": 1,
    "device_key": "abc123",
    "name": "我的iPhone"
  }
]
```

### 4.2 添加Bark账户
- **路径**: POST `/api/user/bark-accounts`
- **功能**: 添加Bark账户
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| device_key | string | 是 | Bark设备key |
| name | string | 否 | 设备名称 |

- **响应示例**:
```json
{
  "success": true,
  "message": "Bark账户添加成功"
}
```

### 4.3 删除Bark账户
- **路径**: DELETE `/api/user/bark-accounts/:id`
- **功能**: 删除Bark账户
- **响应示例**:
```json
{
  "success": true,
  "message": "Bark账户删除成功"
}
```

## 5. 管理员API

### 5.1 获取所有用户
- **路径**: GET `/api/admin/users`
- **功能**: 获取所有用户信息(仅管理员)
- **响应示例**:
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "is_admin": true
  },
  {
    "id": 2,
    "username": "user1",
    "email": "user1@example.com",
    "is_admin": false
  }
]
```

### 5.2 获取所有倒计时
- **路径**: GET `/api/admin/timers`
- **功能**: 获取所有用户的倒计时(仅管理员)
- **响应示例**: 同用户倒计时列表

### 5.3 删除用户
- **路径**: DELETE `/api/admin/users/:id`
- **功能**: 删除用户(仅管理员)
- **响应示例**:
```json
{
  "success": true,
  "message": "用户删除成功"
}
```

### 5.4 删除倒计时
- **路径**: DELETE `/api/admin/timers/:id`
- **功能**: 删除任意用户的倒计时(仅管理员)
- **响应示例**: 同用户删除倒计时

### 5.5 重置用户密码
- **路径**: POST `/api/admin/users/:id/reset`
- **功能**: 重置用户密码(仅管理员)
- **响应示例**:
```json
{
  "success": true,
  "message": "密码重置成功",
  "newPassword": "123456"
}
```

### 5.6 修改用户邮箱
- **路径**: PUT `/api/admin/users/:id/email`
- **功能**: 修改用户邮箱(仅管理员)
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| email | string | 是 | 新邮箱地址 |

- **响应示例**:
```json
{
  "success": true,
  "message": "邮箱修改成功"
}
```

### 5.7 添加用户
- **路径**: POST `/api/admin/users`
- **功能**: 添加用户(仅管理员)
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| username | string | 是 | 用户名 |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |
| is_admin | boolean | 否 | 是否管理员 |

- **响应示例**:
```json
{
  "success": true,
  "message": "用户添加成功",
  "userId": 123
}
```

## 6. SMTP配置管理API

### 6.1 获取SMTP配置
- **路径**: GET `/api/admin/smtp`
- **功能**: 获取SMTP配置(仅管理员)
- **响应示例**:
```json
{
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "user@example.com",
    "pass": "password"
  },
  "from": "noreply@example.com"
}
```

### 6.2 更新SMTP配置
- **路径**: PUT `/api/admin/smtp`
- **功能**: 更新SMTP配置(仅管理员)
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| host | string | 是 | SMTP服务器地址 |
| port | number | 是 | SMTP端口 |
| secure | boolean | 是 | 是否使用SSL |
| auth.user | string | 是 | SMTP用户名 |
| auth.pass | string | 是 | SMTP密码 |
| from | string | 是 | 发件人邮箱 |

- **响应示例**:
```json
{
  "success": true,
  "message": "SMTP配置更新成功"
}
```

### 6.3 测试SMTP配置
- **路径**: POST `/api/admin/smtp/test`
- **功能**: 测试SMTP配置(仅管理员)
- **请求参数**:

| 参数名 | 类型 | 是否必需 | 说明 |
|--------|------|----------|------|
| to | string | 是 | 测试收件邮箱 |

- **响应示例**:
```json
{
  "success": true,
  "message": "测试邮件发送成功"
}
```

## 错误处理

| 错误码 | 含义 | 应对方式 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求参数是否符合要求 |
| 401 | 未授权/未登录 | 检查是否已登录或token是否有效 |
| 403 | 无权限 | 检查用户权限 |
| 404 | 资源不存在 | 检查请求的资源ID是否存在 |
| 500 | 服务器错误 | 联系管理员或稍后重试 |