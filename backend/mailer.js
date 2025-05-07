const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const { BarkClient } = require('@thiskyhan/bark.js');

// 常量配置
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || 10 * 1000;
const SMTP_RELOAD_INTERVAL = process.env.SMTP_RELOAD_INTERVAL || 10 * 60 * 1000;
const DEFAULT_SMTP_PORT = 465;

// 工具函数
function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port) || DEFAULT_SMTP_PORT,
    secure: Boolean(config.secure),
    auth: {
      user: config.username,
      pass: config.password
    },
    tls: {
      rejectUnauthorized: false // 注意：在生产环境中可能需要启用证书验证
    }
  });
}

function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

const db = new sqlite3.Database('./data/data.db');

// 创建一个可重用的transporter
let transporter = null;
let isReady = false;

// 从环境变量获取SMTP配置
function getEnvSmtpConfig() {
  const config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    username: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    from_name: process.env.SMTP_FROM_NAME
  };

  // 检查环境变量是否完整
  const missingVars = [];
  if (!config.host) missingVars.push('SMTP_HOST');
  if (!config.port) missingVars.push('SMTP_PORT');
  if (!config.username) missingVars.push('SMTP_USER');
  if (!config.password) missingVars.push('SMTP_PASS');
  
  if (missingVars.length > 0) {
    console.warn('[warning]缺少以下环境变量:', missingVars.join(', '));
  }

  return config;
}

// 初始化或更新transporter
async function initTransporter() {
  try {
    const setting = await queryDb('SELECT use_env_config FROM smtp_config ORDER BY id DESC LIMIT 1');
    const useEnvConfig = setting ? setting.use_env_config : 1; // 默认使用环境变量
    console.log('Using config source:', useEnvConfig ? 'env' : 'db');

    let config;
    if (useEnvConfig) {
      config = getEnvSmtpConfig();
      if (!config.host || !config.username || !config.password) {
        console.warn('[warning]环境变量SMTP配置不完整，使用数据库配置');
        config = await queryDb('SELECT * FROM smtp_config ORDER BY id DESC LIMIT 1');
      }
    } else {
      config = await queryDb('SELECT * FROM smtp_config ORDER BY id DESC LIMIT 1');
    }

    if (!config || !config.host || !config.username || !config.password) {
      throw new Error('SMTP配置不完整');
    }

    transporter = createTransporter(config);
    isReady = true;
    return transporter;
  } catch (error) {
    console.error('[warning]创建SMTP传输对象失败:', error);
    isReady = false;
    throw error;
  }
}

// 确保transporter已初始化
async function ensureReady() {
  if (!isReady) {
    await initTransporter();
  }
  return transporter;
}

// 初始化transporter
initTransporter().catch(console.error);

// 定期重新加载SMTP配置
setInterval(() => {
  initTransporter().catch(console.error);
}, SMTP_RELOAD_INTERVAL);

// 发送邮件
async function sendMail(to, subject, text) {
  try {
    await ensureReady();

    // 获取当前配置来源
    const setting = await queryDb('SELECT use_env_config FROM smtp_config ORDER BY id DESC LIMIT 1');
    const useEnvConfig = setting ? setting.use_env_config : 1;
    let fromConfig;

    if (useEnvConfig) {
      const envConfig = getEnvSmtpConfig();
      fromConfig = {
        from_name: envConfig.from_name || '倒计时提醒助手',
        username: envConfig.username
      };
    } else {
      fromConfig = await queryDb('SELECT from_name, username FROM smtp_config ORDER BY id DESC LIMIT 1');
    }

    // 发送邮件
    const result = await transporter.sendMail({
      from: `"${fromConfig.from_name}" <${fromConfig.username}>`,
      to,
      subject,
      text
    });

    console.log(`[log]邮件发送成功 (收件人:${to}, 标题:${subject})`);
    return result;
  } catch (error) {
    console.error(`[error]发送邮件失败 (收件人:${to}, 标题:${subject}):`, error);
    
    // 如果发送失败，尝试重新初始化transporter并重试一次
    try {
      console.log('[log]尝试重新初始化transporter并重试发送');
      await initTransporter();
      const result = await transporter.sendMail({
        from: `"${fromConfig.from_name}" <${fromConfig.username}>`,
        to,
        subject,
        text
      });
      console.log(`[log]重试发送成功 (收件人:${to}, 标题:${subject})`);
      return result;
    } catch (retryError) {
      console.error(`[error]重试发送邮件失败 (收件人:${to}, 标题:${subject}):`, retryError);
      throw retryError;
    }
  }
}

// 定时任务：定期检查需要发送的通知
setInterval(() => {
  const now = new Date().toISOString();
  db.all(`SELECT timers.*, users.email FROM timers JOIN users ON timers.user_id = users.id WHERE timers.notified = 0 AND timers.end_time <= ?`, [now], (err, rows) => {
    if (err) {
      console.error('[error]数据库查询失败:', err);
      return;
    }
    rows.forEach(async timer => {
      const nowStr = new Date().toISOString();
      let notificationSent = false;
      
      // 邮件推送
      if (timer.notify_email) {
        try {
          await sendMail(timer.notify_email, `倒计时提醒：${timer.title}`, timer.email_content || `您的倒计时"${timer.title}"已到达：${timer.end_time}`);
          console.log(`[log]已发送邮件给${timer.notify_email}，标题：${timer.title}`);
          notificationSent = true;
        } catch (e) {
          console.error(`[error]邮件发送失败（收件人：${timer.notify_email}，标题：${timer.title}）：`, e && e.stack ? e.stack : e);
        }
      }
      
      // Bark 推送
      if (timer.bark_account_id) {
        db.get('SELECT * FROM user_bark_accounts WHERE id = ?', [timer.bark_account_id], async (err, barkAcc) => {
          if (!err && barkAcc) {
            const client = new BarkClient({ baseUrl: barkAcc.base_url, key: barkAcc.api_key });
            const payload = {
              body: timer.bark_body || timer.email_content || `您的倒计时"${timer.title}"已到达：${timer.end_time}`,
              title: timer.bark_title || timer.title
            };
            
            // 添加可选的Bark参数
            if (timer.bark_group) payload.group = timer.bark_group;
            if (timer.bark_sound) payload.sound = timer.bark_sound;
            if (timer.bark_level) payload.level = timer.bark_level;
            if (timer.bark_copy) payload.copy = timer.bark_copy;
            if (timer.bark_url) payload.url = timer.bark_url;
            
            try {
              await client.pushMessage(payload);
              console.log(`[log]Bark推送成功：${timer.title}`);
              notificationSent = true;
              handleNextCycle(timer, nowStr);
            } catch (e) {
              console.error('[error]Bark推送失败:', e);
            }
          }
        });
        notificationSent = true;
      }
      
      // 无推送渠道也要走周期逻辑
      if (!timer.notify_email && !timer.bark_account_id) {
        handleNextCycle(timer, nowStr);
      } else if (notificationSent && !timer.bark_account_id) {
        // 只有邮件推送时，处理周期逻辑
        handleNextCycle(timer, nowStr);
      }
    });
  });
}, CHECK_INTERVAL);

// 新增：周期性提醒处理函数
function handleNextCycle(timer, nowStr) {
  let nextTime = null;
  if (timer.repeat_type && timer.repeat_type !== 'none') {
    let cur = new Date(timer.end_time);
    const nowDate = new Date();
    while (cur <= nowDate) {
      if (timer.repeat_type === 'minute') cur.setMinutes(cur.getMinutes() + (timer.repeat_value || 1));
      if (timer.repeat_type === 'hour') cur.setHours(cur.getHours() + (timer.repeat_value || 1));
      if (timer.repeat_type === 'day') cur.setDate(cur.getDate() + (timer.repeat_value || 1));
      if (timer.repeat_type === 'month') cur.setMonth(cur.getMonth() + (timer.repeat_value || 1));
      if (timer.repeat_type === 'year') cur.setFullYear(cur.getFullYear() + (timer.repeat_value || 1));
    }
    nextTime = cur.toISOString();
  }
  if (nextTime && (!timer.repeat_until || nextTime <= timer.repeat_until)) {
    db.run('UPDATE timers SET end_time = ?, notified = 0, last_notified_at = ? WHERE id = ?', [nextTime, nowStr, timer.id]);
    console.log(`[log]定期提醒：已推算下次提醒时间为${nextTime}`);
  } else {
    db.run('UPDATE timers SET notified = 1, last_notified_at = ? WHERE id = ?', [nowStr, timer.id]);
  }
}

module.exports = {
  sendMail,
  initTransporter
}; 