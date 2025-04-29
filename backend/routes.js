const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
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
    res.json(rows);
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
    res.json(rows);
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
  
  // 检查邮箱是否已被使用
  db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id], (err, row) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    if (row) return res.status(400).json({ msg: '该邮箱已被使用' });
    
    // 更新邮箱
    db.run('UPDATE users SET email = ? WHERE id = ?', [email, req.params.id], function(err) {
      if (err) return res.status(500).json({ msg: '修改失败' });
      res.json({ msg: '修改成功' });
    });
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
  
  // 检查用户名和邮箱是否已存在
  db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
    if (err) return res.status(500).json({ msg: '查询失败' });
    if (row) return res.status(400).json({ msg: '用户名或邮箱已存在' });
    
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

module.exports = router; 