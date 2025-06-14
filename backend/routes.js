const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const router = express.Router();
const db = new sqlite3.Database('./data/data.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 数据库服务层
class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

const dbService = new DatabaseService(db);

// 工具函数
function validatePassword(password) {
  if (!password) return { valid: false, message: '密码不能为空' };
  if (password.length < 8) return { valid: false, message: '密码至少需要8个字符' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: '密码需要包含大写字母' };
  if (!/[a-z]/.test(password)) return { valid: false, message: '密码需要包含小写字母' };
  if (!/[0-9]/.test(password)) return { valid: false, message: '密码需要包含数字' };
  return { valid: true };
}

function validateEmail(email) {
  if (!email) return { valid: false, message: '邮箱不能为空' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, message: '邮箱格式不正确' };
  return { valid: true };
}

// 统一错误处理中间件
function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  res.status(500).json({ 
    success: false,
    message: '服务器错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

// 速率限制配置
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP 5次请求
  message: '尝试次数过多，请稍后再试'
});

// 计算倒计时状态
function calculateTimerStatus(timer, now = new Date()) {
  if (timer.notified) {
    return '已通知';
  }
  
  if (timer.repeat_type && timer.repeat_type !== 'none') {
    let next = new Date(timer.end_time);
    const repeatValue = timer.repeat_value || 1;
    let unit = timer.repeat_type;
    
    while (next <= now) {
      if (unit === 'minute') next.setMinutes(next.getMinutes() + repeatValue);
      if (unit === 'hour') next.setHours(next.getHours() + repeatValue);
      if (unit === 'day') next.setDate(next.getDate() + repeatValue);
      if (unit === 'month') next.setMonth(next.getMonth() + repeatValue);
      if (unit === 'year') next.setFullYear(next.getFullYear() + repeatValue);
    }
    
    const diffMs = next - now;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMin < 1) {
      return '即将通知';
    } else if (diffMin < 60) {
      return `下一次通知在${diffMin}分钟后`;
    } else if (diffHour < 24) {
      const remainMinutes = diffMin % 60;
      return remainMinutes > 0 
        ? `下一次通知在${diffHour}小时${remainMinutes}分钟后`
        : `下一次通知在${diffHour}小时后`;
    } else {
      const remainHours = diffHour % 24;
      return remainHours > 0
        ? `下一次通知在${diffDay}天${remainHours}小时后`
        : `下一次通知在${diffDay}天后`;
    }
  }
  
  return '等待通知';
}

// 用户注册
router.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 参数验证
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    // 验证邮箱格式
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }
    
    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }
    
    // 检查用户名和邮箱是否已存在
    const existingUser = await dbService.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名或邮箱已存在' });
    }
    
    // 创建用户
    const hash = await bcrypt.hash(password, 10);
    const result = await dbService.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    
    res.json({ success: true, message: '注册成功', userId: result.lastID });
  } catch (error) {
    console.error('[error]注册失败:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

// 用户登录
router.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const user = await dbService.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ success: false, message: '用户不存在' });
    }
    
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      return res.status(400).json({ success: false, message: '密码错误' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        username: user.username,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('[error]登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 鉴权中间件
function auth(req, res, next) {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ success: false, message: '无效token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('[error]鉴权失败:', error);
    res.status(500).json({ success: false, message: '鉴权失败' });
  }
}

// 管理员鉴权
async function adminOnly(req, res, next) {
  try {
    const user = await dbService.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.is_admin) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    next();
  } catch (error) {
    console.error('[error]管理员鉴权失败:', error);
    res.status(500).json({ success: false, message: '鉴权失败' });
  }
}

// 新建倒计时
router.post('/api/timers', auth, async (req, res) => {
  try {
    const {
      title, end_time, email_content, repeat_type = 'none', repeat_until = null, 
      repeat_value = 1, notify_email = null, bark_account_id = null,
      bark_title = null, bark_body = null, bark_group = null, 
      bark_sound = null, bark_level = null, bark_copy = null, bark_url = null
    } = req.body;

    // 基本参数验证
    if (!title || !end_time) {
      return res.status(400).json({ success: false, message: '标题和截止时间不能为空' });
    }

    // 验证日期格式
    const endTimeDate = new Date(end_time);
    if (isNaN(endTimeDate.getTime())) {
      return res.status(400).json({ success: false, message: '截止时间格式不正确' });
    }

    // 验证重复设置
    if (repeat_type !== 'none' && repeat_type !== undefined) {
      if (!['minute', 'hour', 'day', 'month', 'year'].includes(repeat_type)) {
        return res.status(400).json({ success: false, message: '无效的重复类型' });
      }
      if (repeat_value < 1) {
        return res.status(400).json({ success: false, message: '重复间隔必须大于0' });
      }
      if (repeat_until) {
        const repeatUntilDate = new Date(repeat_until);
        if (isNaN(repeatUntilDate.getTime())) {
          return res.status(400).json({ success: false, message: '周期终止时间格式不正确' });
        }
      }
    }

    // 验证邮箱格式
    if (notify_email) {
      const emailValidation = validateEmail(notify_email);
      if (!emailValidation.valid) {
        return res.status(400).json({ success: false, message: emailValidation.message });
      }
    }

    // 插入数据库
    const sql = `
      INSERT INTO timers (
        user_id, title, end_time, email_content, repeat_type, repeat_until, 
        repeat_value, notify_email, bark_account_id, bark_title, bark_body, 
        bark_group, bark_sound, bark_level, bark_copy, bark_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      req.user.id, title, end_time, email_content, repeat_type, repeat_until,
      repeat_value, notify_email, bark_account_id, bark_title, bark_body,
      bark_group, bark_sound, bark_level, bark_copy, bark_url
    ];

    const result = await dbService.run(sql, params);
    res.json({ success: true, message: '创建成功', timerId: result.lastID });
  } catch (error) {
    console.error('[error]创建倒计时失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 查询当前用户所有倒计时
router.get('/api/timers', auth, async (req, res) => {
  try {
    const timers = await dbService.queryAll('SELECT * FROM timers WHERE user_id = ?', [req.user.id]);
    const result = timers.map(timer => ({
      ...timer,
      status: calculateTimerStatus(timer)
    }));
    res.json(result);
  } catch (error) {
    console.error('[error]查询倒计时失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

// 删除倒计时
router.delete('/api/timers/:id', auth, async (req, res) => {
  try {
    const result = await dbService.run(
      'DELETE FROM timers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '倒计时不存在或无权限删除' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('[error]删除倒计时失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 获取所有用户（admin）
router.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await dbService.queryAll('SELECT id, username, email, is_admin FROM users');
    res.json(users);
  } catch (error) {
    console.error('[error]获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

// 获取所有倒计时（admin）
router.get('/api/admin/timers', auth, adminOnly, async (req, res) => {
  try {
    const timers = await dbService.queryAll(
      'SELECT timers.*, users.username FROM timers LEFT JOIN users ON timers.user_id = users.id'
    );
    const result = timers.map(timer => ({
      ...timer,
      status: calculateTimerStatus(timer)
    }));
    res.json(result);
  } catch (error) {
    console.error('[error]获取倒计时列表失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

// 删除用户（admin）
router.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const result = await dbService.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('[error]删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 删除倒计时（admin）
router.delete('/api/admin/timers/:id', auth, adminOnly, async (req, res) => {
  try {
    const result = await dbService.run('DELETE FROM timers WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '倒计时不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('[error]删除倒计时失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 重置用户密码（admin）
router.post('/api/admin/users/:id/reset', auth, adminOnly, async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password) {
      return res.status(400).json({ success: false, message: '新密码不能为空' });
    }

    const passwordValidation = validatePassword(new_password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const hash = await bcrypt.hash(new_password, 10);
    const result = await dbService.run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hash, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, message: '重置成功' });
  } catch (error) {
    console.error('[error]重置密码失败:', error);
    res.status(500).json({ success: false, message: '重置失败' });
  }
});

// 获取当前用户信息
router.get('/api/user', auth, (req, res) => {
  db.get('SELECT id, username, email, is_admin FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ msg: '未找到用户' });
    res.json(user);
  });
});

// 邮箱管理相关API
router.get('/api/user/emails', auth, (req, res) => {
  db.all('SELECT id, email FROM user_emails WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    res.json(rows);
  });
});
router.post('/api/user/emails', auth, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: '邮箱不能为空' });
  db.run('INSERT INTO user_emails (user_id, email) VALUES (?, ?)', [req.user.id, email], function(err) {
    if (err) return res.status(400).json({ msg: '添加失败，可能已存在' });
    res.json({ id: this.lastID, email });
  });
});
router.delete('/api/user/emails/:id', auth, (req, res) => {
  db.run('DELETE FROM user_emails WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ msg: '删除失败' });
    res.json({ msg: '删除成功' });
  });
});

// 编辑倒计时
router.put('/api/timers/:id', auth, async (req, res) => {
  try {
    const {
      title, end_time, email_content, repeat_type = 'none', repeat_until = null,
      repeat_value = 1, notify_email = null, bark_account_id = null,
      bark_title = null, bark_body = null, bark_group = null,
      bark_sound = null, bark_level = null, bark_copy = null, bark_url = null
    } = req.body;

    // 验证参数
    if (!title || !end_time) {
      return res.status(400).json({ success: false, message: '标题和截止时间不能为空' });
    }

    // 验证日期格式
    const endTimeDate = new Date(end_time);
    if (isNaN(endTimeDate.getTime())) {
      return res.status(400).json({ success: false, message: '截止时间格式不正确' });
    }

    // 验证邮箱格式
    if (notify_email) {
      const emailValidation = validateEmail(notify_email);
      if (!emailValidation.valid) {
        return res.status(400).json({ success: false, message: emailValidation.message });
      }
    }

    const result = await dbService.run(
      `UPDATE timers SET 
        title = ?, end_time = ?, email_content = ?, repeat_type = ?, 
        repeat_until = ?, repeat_value = ?, notified = 0, notify_email = ?, 
        bark_account_id = ?, bark_title = ?, bark_body = ?, bark_group = ?, 
        bark_sound = ?, bark_level = ?, bark_copy = ?, bark_url = ? 
      WHERE id = ? AND user_id = ?`,
      [
        title, end_time, email_content, repeat_type, repeat_until, repeat_value,
        notify_email, bark_account_id, bark_title, bark_body, bark_group,
        bark_sound, bark_level, bark_copy, bark_url, req.params.id, req.user.id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '倒计时不存在或无权限修改' });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('[error]更新倒计时失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 修改用户邮箱（admin）
router.put('/api/admin/users/:id/email', auth, adminOnly, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: '新邮箱不能为空' });
    }
    
    // 验证邮箱格式
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }
    
    const result = await dbService.run(
      'UPDATE users SET email = ? WHERE id = ?',
      [email, req.params.id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('[error]更新邮箱失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 添加用户（admin）
router.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { username, email, password, is_admin = 0 } = req.body;
    
    // 参数验证
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    // 验证邮箱格式
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }
    
    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }
    
    // 检查用户名是否已存在
    const existingUser = await dbService.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const result = await dbService.run(
      'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
      [username, email, hash, is_admin]
    );
    
    res.json({
      success: true,
      message: '创建成功',
      data: {
        id: result.lastID,
        username,
        email,
        is_admin
      }
    });
  } catch (error) {
    console.error('[error]创建用户失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 从环境变量获取SMTP配置
function getEnvSmtpConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    username: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    from_name: process.env.SMTP_FROM_NAME
  };
}

// SMTP配置管理API
router.get('/api/admin/smtp', auth, adminOnly, (req, res) => {
  // 先获取配置选项
  db.get('SELECT use_env_config FROM smtp_config ORDER BY id DESC LIMIT 1', (err, setting) => {
    if (err) {
      console.error('查询SMTP配置失败:', err);
      return res.status(500).json({ msg: '查询失败' });
    }
    
    const useEnvConfig = setting ? setting.use_env_config : 1; // 默认使用环境变量
    //console.log('Current config mode:', useEnvConfig); // 添加调试日志
    
    // 如果使用环境变量配置
    if (useEnvConfig) {
      const envConfig = getEnvSmtpConfig();
      if (envConfig.host && envConfig.username) {
        const config = { 
          ...envConfig, 
          source: 'env',
          use_env_config: 1,
          secure: envConfig.secure
        };
        return res.json(config);
      }
    }

    // 使用数据库配置
    db.get('SELECT id, host, port, secure, username, from_name, use_env_config, created_at, updated_at FROM smtp_config ORDER BY id DESC LIMIT 1', (err, config) => {
      if (err) {
        console.error('查询SMTP配置失败:', err);
        return res.status(500).json({ msg: '查询失败' });
      }
      if (config) {
        config.source = 'db';
        config.secure = Boolean(config.secure);
      }
      return res.json(config || { 
        host: '',
        port: '587',
        secure: false,
        username: '',
        from_name: '倒计时提醒助手',
        use_env_config: useEnvConfig 
      });
    });
  });
});

// 更新环境变量配置
async function updateEnvConfig(config) {
  const fs = require('fs').promises;
  const path = require('path');
  const envPath = path.join(__dirname, '../.env');
  
  try {
    let envContent = await fs.readFile(envPath, 'utf8');
    const envLines = envContent.split('\n');
    const configMap = {
      'SMTP_HOST': config.host,
      'SMTP_PORT': config.port,
      'SMTP_USER': config.username,
      'SMTP_PASS': config.password,
      'SMTP_SECURE': config.secure ? 'true' : 'false',
      'SMTP_FROM_NAME': config.from_name
    };

    // 更新环境变量
    for (const [key, value] of Object.entries(configMap)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const exists = envLines.some(line => regex.test(line));
      
      if (exists) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    await fs.writeFile(envPath, envContent.trim() + '\n');
    
    // 重新加载环境变量
    Object.assign(process.env, configMap);
    
    return true;
  } catch (error) {
    console.error('更新环境变量失败:', error);
    return false;
  }
}

router.put('/api/admin/smtp', auth, adminOnly, async (req, res) => {
  const { host, port, secure, username, password, from_name, use_env_config } = req.body;
  console.log('Updating SMTP config:', { use_env_config, from_name }); // 添加调试日志
  
  try {
    // 使用环境变量配置时，只需要验证 from_name
    if (use_env_config) {
      if (!from_name) {
        return res.status(400).json({ msg: '发件人名称不能为空' });
      }
      
      // 更新数据库中的配置
      db.run(`
        UPDATE smtp_config 
        SET from_name = ?, use_env_config = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = (SELECT id FROM smtp_config ORDER BY id DESC LIMIT 1)
      `, [from_name], function(err) {
        if (err) {
          console.error('更新失败:', err);
          return res.status(500).json({ msg: '更新失败' });
        }
        
        // 如果没有更新任何记录，则插入新记录
        if (this.changes === 0) {
          const envConfig = getEnvSmtpConfig();
          db.run(`
            INSERT INTO smtp_config (host, port, secure, username, password, from_name, use_env_config)
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `, [
            envConfig.host || 'smtp.example.com',
            envConfig.port || '587',
            envConfig.secure ? 1 : 0,
            envConfig.username || 'user@example.com',
            envConfig.password || 'password',
            from_name
          ], function(err) {
            if (err) {
              console.error('创建失败:', err);
              return res.status(500).json({ msg: '创建失败' });
            }
            res.json({ success: true, msg: '创建成功' });
          });
        } else {
          res.json({ success: true, msg: '更新成功' });
        }
      });
      return; // 添加 return 语句，避免执行后面的代码
    }

    // 使用数据库配置时，验证所有必要参数
    if (!host || !port || !username || !password || !from_name) {
      return res.status(400).json({ msg: '参数不完整' });
    }

    // 更新数据库配置
    db.run(`
      UPDATE smtp_config 
      SET host = ?, port = ?, secure = ?, username = ?, password = ?, from_name = ?, use_env_config = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = (SELECT id FROM smtp_config ORDER BY id DESC LIMIT 1)
    `, [host, port, secure ? 1 : 0, username, password, from_name], function(err) {
      if (err) {
        console.error('更新失败:', err);
        return res.status(500).json({ msg: '更新失败' });
      }
      
      // 如果没有更新任何记录，则插入新记录
      if (this.changes === 0) {
        db.run(`
          INSERT INTO smtp_config (host, port, secure, username, password, from_name, use_env_config)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [host, port, secure ? 1 : 0, username, password, from_name], function(err) {
          if (err) {
            console.error('创建失败:', err);
            return res.status(500).json({ msg: '创建失败' });
          }
          res.json({ success: true, msg: '创建成功' });
        });
      } else {
        res.json({ success: true, msg: '更新成功' });
      }
    });
  } catch (error) {
    console.error('保存SMTP配置失败:', error);
    res.status(500).json({ msg: '保存失败：' + error.message });
  }
});

// 测试SMTP配置
router.post('/api/admin/smtp/test', auth, adminOnly, async (req, res) => {
  const { test_email } = req.body;
  
  if (!test_email) {
    return res.status(400).json({ msg: '请提供测试邮箱地址' });
  }

  // 先获取当前配置来源
  db.get('SELECT use_env_config FROM smtp_config ORDER BY id DESC LIMIT 1', async (err, setting) => {
    if (err) {
      console.error('查询配置来源失败:', err);
      return res.status(500).json({ msg: '查询配置失败' });
    }

    const useEnvConfig = setting ? setting.use_env_config : 1;
    console.log('Testing with config mode:', useEnvConfig); // 添加调试日志

    try {
      let smtpConfig;
      
      if (useEnvConfig) {
        // 使用环境变量配置
        smtpConfig = getEnvSmtpConfig();
        if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
          return res.status(500).json({ msg: '环境变量SMTP配置不完整' });
        }
      } else {
        // 使用数据库配置
        const dbConfig = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM smtp_config ORDER BY id DESC LIMIT 1', (err, config) => {
            if (err) reject(err);
            else resolve(config);
          });
        });
        
        if (!dbConfig) {
          return res.status(500).json({ msg: '数据库中没有SMTP配置' });
        }
        
        smtpConfig = {
          host: dbConfig.host,
          port: dbConfig.port,
          secure: Boolean(dbConfig.secure),
          username: dbConfig.username,
          password: dbConfig.password,
          from_name: dbConfig.from_name
        };
      }

      // 创建临时 transporter 用于测试
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: Number(smtpConfig.port),
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // 验证配置
      await transporter.verify();

      // 发送测试邮件
      await transporter.sendMail({
        from: `"${smtpConfig.from_name}" <${smtpConfig.username}>`,
        to: test_email,
        subject: 'SMTP配置测试邮件',
        text: `如果您收到这封邮件，说明SMTP配置正确。\n\n配置来源：${useEnvConfig ? '环境变量' : '数据库'}\n发送时间：${new Date().toLocaleString()}`
      });

      res.json({ success: true, msg: '测试邮件发送成功' });
    } catch (error) {
      console.error('发送测试邮件失败:', error);
      res.status(500).json({ 
        msg: '测试失败：' + (error.response?.message || error.message)
      });
    }
  });
});

// ========== Bark账户管理API ==========
// 获取当前用户所有Bark账户
router.get('/api/user/bark-accounts', auth, (req, res) => {
  db.all('SELECT id, name, base_url, api_key FROM user_bark_accounts WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    res.json(rows);
  });
});
// 新增Bark账户
router.post('/api/user/bark-accounts', auth, (req, res) => {
  const { name, base_url, api_key } = req.body;
  if (!name || !base_url || !api_key) return res.status(400).json({ msg: '参数不完整' });
  db.run('INSERT INTO user_bark_accounts (user_id, name, base_url, api_key) VALUES (?, ?, ?, ?)', [req.user.id, name, base_url, api_key], function(err) {
    if (err) return res.status(500).json({ msg: '添加失败' });
    res.json({ id: this.lastID });
  });
});
// 删除Bark账户
router.delete('/api/user/bark-accounts/:id', auth, (req, res) => {
  db.run('DELETE FROM user_bark_accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ msg: '删除失败' });
    res.json({ msg: '删除成功' });
  });
});

// 修改用户密码
router.post('/api/user/change-password', auth, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ msg: '参数不完整' });
  }

  try {
    // 验证旧密码
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const match = await bcrypt.compare(old_password, user.password_hash);
    if (!match) {
      return res.status(400).json({ msg: '原密码错误' });
    }

    // 更新新密码
    const hash = await bcrypt.hash(new_password, 10);
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ msg: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ msg: '修改密码失败' });
  }
});

// 注册错误处理中间件
router.use(errorHandler);

module.exports = router; 