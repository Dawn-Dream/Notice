const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./data.db');

// 新增：插入admin账号逻辑
async function insertAdmin() {
  const username = 'admin';
  const email = 'admin@example.com';
  const password = '123456';
  const is_admin = 1;
  const hash = await bcrypt.hash(password, 10);
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('查询admin用户出错:', err);
      return;
    }
    if (!row) {
      db.run('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)', [username, email, hash, is_admin], (err) => {
        if (err) {
          console.error('插入admin用户失败:', err);
        } else {
          console.log('已插入admin账号');
        }
      });
    } else {
      console.log('admin账号已存在');
    }
  });
}

// 新增：插入默认SMTP配置
async function insertDefaultSmtpConfig() {
  db.get('SELECT * FROM smtp_config LIMIT 1', (err, row) => {
    if (err) {
      console.error('查询SMTP配置出错:', err);
      return;
    }
    if (!row) {
      db.run(`INSERT INTO smtp_config (
        host, port, secure, username, password, from_name, use_env_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'smtp.example.com',
        '587',
        '0',
        'user@example.com',
        'password',
        '倒计时提醒助手',
        1  // 默认使用环境变量配置
      ], (err) => {
        if (err) {
          console.error('插入默认SMTP配置失败:', err);
        } else {
          console.log('已插入默认SMTP配置');
        }
      });
    } else {
      console.log('SMTP配置已存在');
    }
  });
}

db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0
  )`);

  // 倒计时表
  db.run(`CREATE TABLE IF NOT EXISTS timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    end_time TEXT NOT NULL,
    email_content TEXT,
    repeat_type TEXT DEFAULT 'none',
    repeat_until TEXT,
    repeat_value INTEGER DEFAULT 1,
    notified INTEGER DEFAULT 0,
    notify_email TEXT,
    last_notified_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // 用户邮箱表
  db.run(`CREATE TABLE IF NOT EXISTS user_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    UNIQUE(user_id, email),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // SMTP配置表
  db.run(`CREATE TABLE IF NOT EXISTS smtp_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL DEFAULT 'smtp.example.com',
    port TEXT NOT NULL DEFAULT '587',
    secure INTEGER DEFAULT 0,
    username TEXT NOT NULL DEFAULT 'user@example.com',
    password TEXT NOT NULL DEFAULT 'password',
    from_name TEXT DEFAULT '倒计时提醒助手',
    use_env_config INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`ALTER TABLE timers ADD COLUMN notify_email TEXT;`, err => {});
  db.run(`ALTER TABLE timers ADD COLUMN last_notified_at TEXT;`, err => {});

  // 新增：插入admin账号和默认SMTP配置
  Promise.all([
    insertAdmin(),
    insertDefaultSmtpConfig()
  ]).then(() => db.close());
}); 