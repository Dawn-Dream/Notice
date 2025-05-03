const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();
const db = new sqlite3.Database('./data.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 用户注册
router.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ msg: '参数不完整' });
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash], function(err) {
    if (err) return res.status(400).json({ msg: '用户名或邮箱已存在' });
    res.json({ msg: '注册成功' });
  });
});

// 用户登录
router.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ msg: '用户不存在' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ msg: '密码错误' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  });
});

// 鉴权中间件
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: '未登录' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ msg: '无效token' });
    req.user = user;
    next();
  });
}

// 管理员鉴权
function adminOnly(req, res, next) {
  if (!req.user || req.user.username !== 'admin') {
    return res.status(403).json({ msg: '无权限' });
  }
  next();
}

// 新建倒计时
router.post('/api/timers', auth, (req, res) => {
  const { title, end_time, email_content, repeat_type = 'none', repeat_until = null, repeat_value = 1, notify_email = null } = req.body;
  db.run('INSERT INTO timers (user_id, title, end_time, email_content, repeat_type, repeat_until, repeat_value, notify_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.user.id, title, end_time, email_content, repeat_type, repeat_until, repeat_value, notify_email], function(err) {
    if (err) return res.status(500).json({ msg: '创建失败' });
    res.json({ id: this.lastID });
  });
});

// 查询当前用户所有倒计时
router.get('/api/timers', auth, (req, res) => {
  db.all('SELECT * FROM timers WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const result = rows.map(row => {
      let status = '';
      if (row.notified) {
        status = '已通知';
      } else if (row.repeat_type && row.repeat_type !== 'none') {
        // 计算下次通知时间
        let next = new Date(row.end_time);
        const repeatValue = row.repeat_value || 1;
        let unit = row.repeat_type;
        while (next <= now) {
          if (unit === 'minute') next.setMinutes(next.getMinutes() + repeatValue);
          if (unit === 'hour') next.setHours(next.getHours() + repeatValue);
          if (unit === 'day') next.setDate(next.getDate() + repeatValue);
          if (unit === 'month') next.setMonth(next.getMonth() + repeatValue);
          if (unit === 'year') next.setFullYear(next.getFullYear() + repeatValue);
        }
        const diffMs = next - now;
        const diffMin = Math.round(diffMs / (1000 * 60));
        const diffHour = Math.round(diffMs / (1000 * 60 * 60));
        const diffDay = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffMin < 60) {
          status = `下一次通知在${diffMin}分钟后`;
        } else if (diffHour < 24) {
          status = `下一次通知在${diffHour}小时后`;
        } else if (diffDay >= 1) {
          status = `下一次通知在${diffDay}天后`;
        } else {
          status = '等待通知';
        }
      } else {
        status = '等待通知';
      }
      return { ...row, status };
    });
    res.json(result);
  });
});

// 删除倒计时
router.delete('/api/timers/:id', auth, (req, res) => {
  db.run('DELETE FROM timers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ msg: '删除失败' });
    res.json({ msg: '删除成功' });
  });
});

// 获取所有用户（admin）
router.get('/api/admin/users', auth, adminOnly, (req, res) => {
  db.all('SELECT id, username, email, is_admin FROM users', (err, rows) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    res.json(rows);
  });
});

// 获取所有倒计时（admin）
router.get('/api/admin/timers', auth, adminOnly, (req, res) => {
  db.all('SELECT timers.*, users.username FROM timers LEFT JOIN users ON timers.user_id = users.id', (err, rows) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const result = rows.map(row => {
      let status = '';
      if (row.notified) {
        status = '已通知';
      } else if (row.repeat_type && row.repeat_type !== 'none') {
        // 计算下次通知时间
        let next = new Date(row.end_time);
        const repeatValue = row.repeat_value || 1;
        let unit = row.repeat_type;
        while (next <= now) {
          if (unit === 'minute') next.setMinutes(next.getMinutes() + repeatValue);
          if (unit === 'hour') next.setHours(next.getHours() + repeatValue);
          if (unit === 'day') next.setDate(next.getDate() + repeatValue);
          if (unit === 'month') next.setMonth(next.getMonth() + repeatValue);
          if (unit === 'year') next.setFullYear(next.getFullYear() + repeatValue);
        }
        const diffMs = next - now;
        const diffMin = Math.round(diffMs / (1000 * 60));
        const diffHour = Math.round(diffMs / (1000 * 60 * 60));
        const diffDay = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffMin < 60) {
          status = `下一次通知在${diffMin}分钟后`;
        } else if (diffHour < 24) {
          status = `下一次通知在${diffHour}小时后`;
        } else if (diffDay >= 1) {
          status = `下一次通知在${diffDay}天后`;
        } else {
          status = '等待通知';
        }
      } else {
        status = '等待通知';
      }
      return { ...row, status };
    });
    res.json(result);
  });
});

// 删除用户（admin）
router.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ msg: '删除失败' });
    res.json({ msg: '删除成功' });
  });
});

// 删除倒计时（admin）
router.delete('/api/admin/timers/:id', auth, adminOnly, (req, res) => {
  db.run('DELETE FROM timers WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ msg: '删除失败' });
    res.json({ msg: '删除成功' });
  });
});

// 重置用户密码（admin）
router.post('/api/admin/users/:id/reset', auth, adminOnly, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password) return res.status(400).json({ msg: '新密码不能为空' });
  const hash = await bcrypt.hash(new_password, 10);
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id], function(err) {
    if (err) return res.status(500).json({ msg: '重置失败' });
    res.json({ msg: '重置成功' });
  });
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
router.put('/api/timers/:id', auth, (req, res) => {
  const { title, end_time, email_content, repeat_type = 'none', repeat_until = null, repeat_value = 1, notify_email = null } = req.body;
  db.run('UPDATE timers SET title = ?, end_time = ?, email_content = ?, repeat_type = ?, repeat_until = ?, repeat_value = ?, notified = 0, notify_email = ? WHERE id = ? AND user_id = ?', [title, end_time, email_content, repeat_type, repeat_until, repeat_value, notify_email, req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ msg: '更新失败', error: err.message });
    res.json({ msg: '更新成功' });
  });
});

// 修改用户邮箱（admin）
router.put('/api/admin/users/:id/email', auth, adminOnly, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: '新邮箱不能为空' });
  
  // 检查邮箱格式
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ msg: '邮箱格式不正确' });
  }
  
  // 直接更新邮箱
  db.run('UPDATE users SET email = ? WHERE id = ?', [email, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ msg: '更新失败' });
    }
    res.json({ msg: '更新成功' });
  });
});

// 添加用户（admin）
router.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  const { username, email, password, is_admin = 0 } = req.body;
  
  // 参数验证
  if (!username || !email || !password) {
    return res.status(400).json({ msg: '参数不完整' });
  }
  
  // 检查邮箱格式
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ msg: '邮箱格式不正确' });
  }
  
  // 只检查用户名是否已存在
  db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    if (row) return res.status(400).json({ msg: '用户名已存在' });
    
    try {
      const hash = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)', 
        [username, email, hash, is_admin], 
        function(err) {
          if (err) return res.status(500).json({ msg: '创建失败' });
          res.json({ 
            msg: '创建成功',
            user: {
              id: this.lastID,
              username,
              email,
              is_admin
            }
          });
        }
      );
    } catch (err) {
      res.status(500).json({ msg: '密码加密失败' });
    }
  });
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
    console.log('Current config mode:', useEnvConfig); // 添加调试日志
    
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

module.exports = router; 