const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const { BarkClient } = require('@thiskyhan/bark.js');

const db = new sqlite3.Database('./data/data.db');

// 创建一个可重用的transporter
let transporter = null;

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
    console.warn('缺少以下环境变量:', missingVars.join(', '));
  }

  return config;
}

// 初始化或更新transporter
async function initTransporter() {
  return new Promise((resolve, reject) => {
    // 先检查是否使用环境变量配置
    db.get('SELECT use_env_config FROM smtp_config ORDER BY id DESC LIMIT 1', (err, setting) => {
      if (err) {
        console.error('获取配置来源失败:', err);
        reject(err);
        return;
      }

      const useEnvConfig = setting ? setting.use_env_config : 1; // 默认使用环境变量
      console.log('Using config source:', useEnvConfig ? 'env' : 'db'); // 添加调试日志

      if (useEnvConfig) {
        // 尝试使用环境变量配置
        const envConfig = getEnvSmtpConfig();
        if (!envConfig.host || !envConfig.username || !envConfig.password) {
          // 如果环境变量配置不完整，尝试切换到数据库配置
          console.warn('环境变量SMTP配置不完整，尝试切换到数据库配置');
          db.run('UPDATE smtp_config SET use_env_config = 0 WHERE id = (SELECT id FROM smtp_config ORDER BY id DESC LIMIT 1)', async function(err) {
            if (err) {
              console.error('切换到数据库配置失败:', err);
              reject(new Error('环境变量配置不完整且无法切换到数据库配置'));
              return;
            }
            // 递归调用以使用数据库配置
            try {
              const newTransporter = await initTransporter();
              resolve(newTransporter);
            } catch (error) {
              reject(error);
            }
          });
          return;
        }

        try {
          transporter = nodemailer.createTransport({
            host: envConfig.host,
            port: Number(envConfig.port) || 465,
            secure: envConfig.secure !== undefined ? envConfig.secure : true,
            auth: {
              user: envConfig.username,
              pass: envConfig.password
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          console.log('使用环境变量SMTP配置:', {
            host: envConfig.host,
            port: envConfig.port,
            secure: envConfig.secure,
            user: envConfig.username
          });

          resolve(transporter);
          return;
        } catch (error) {
          console.error('创建SMTP传输对象失败(环境变量):', error);
          reject(error);
          return;
        }
      }

      // 使用数据库配置
      db.get('SELECT * FROM smtp_config ORDER BY id DESC LIMIT 1', (err, config) => {
        if (err) {
          console.error('获取SMTP配置失败:', err);
          reject(err);
          return;
        }
        
        if (!config) {
          const error = new Error('未找到SMTP配置');
          console.error(error.message);
          reject(error);
          return;
        }

        try {
          transporter = nodemailer.createTransport({
            host: config.host,
            port: Number(config.port),
            secure: Boolean(config.secure),
            auth: {
              user: config.username,
              pass: config.password
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          console.log('使用数据库SMTP配置:', {
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.username
          });

          resolve(transporter);
        } catch (error) {
          console.error('创建SMTP传输对象失败(数据库):', error);
          reject(error);
        }
      });
    });
  });
}

// 初始化transporter
initTransporter().catch(console.error);

// 每10分钟重新加载SMTP配置
setInterval(() => {
  initTransporter().catch(console.error);
}, 10 * 60 * 1000);

// 发送邮件
async function sendMail(to, subject, text) {
  try {
    // 如果transporter未初始化，先初始化
    if (!transporter) {
      await initTransporter();
    }

    // 获取当前配置来源
    const setting = await new Promise((resolve, reject) => {
      db.get('SELECT use_env_config FROM smtp_config ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const useEnvConfig = setting ? setting.use_env_config : 1;
    let fromConfig;

    if (useEnvConfig) {
      const envConfig = getEnvSmtpConfig();
      fromConfig = {
        from_name: envConfig.from_name || '倒计时提醒助手',
        username: envConfig.username
      };
    } else {
      fromConfig = await new Promise((resolve, reject) => {
        db.get('SELECT from_name, username FROM smtp_config ORDER BY id DESC LIMIT 1', (err, config) => {
          if (err) reject(err);
          else resolve(config);
        });
      });
    }

    // 发送邮件
    const result = await transporter.sendMail({
      from: `"${fromConfig.from_name}" <${fromConfig.username}>`,
      to,
      subject,
      text
    });

    return result;
  } catch (error) {
    console.error('发送邮件失败:', error);
    
    // 如果发送失败，尝试重新初始化transporter并重试一次
    try {
      await initTransporter();
      const result = await transporter.sendMail({
        from: `"${fromConfig.from_name}" <${fromConfig.username}>`,
        to,
        subject,
        text
      });
      return result;
    } catch (retryError) {
      console.error('重试发送邮件失败:', retryError);
      throw retryError;
    }
  }
}

// 定时任务：每10秒检查一次
setInterval(() => {
  const now = new Date().toISOString();
  db.all(`SELECT timers.*, users.email FROM timers JOIN users ON timers.user_id = users.id WHERE timers.notified = 0 AND timers.end_time <= ?`, [now], (err, rows) => {
    if (err) {
      console.error('数据库查询失败:', err);
      return;
    }
    rows.forEach(async timer => {
      const toEmail = timer.notify_email || timer.email;
      try {
        // 邮件推送
        await sendMail(toEmail, `倒计时提醒：${timer.title}`, timer.email_content || `您的倒计时"${timer.title}"已到达：${timer.end_time}`);
        // Bark 推送
        if (timer.bark_account_id) {
          db.get('SELECT * FROM user_bark_accounts WHERE id = ?', [timer.bark_account_id], async (err, barkAcc) => {
            if (!err && barkAcc) {
              const client = new BarkClient({ baseUrl: barkAcc.base_url, key: barkAcc.api_key });
              const payload = {
                body: timer.email_content || `您的倒计时"${timer.title}"已到达：${timer.end_time}`,
                title: timer.title
              };
              try {
                await client.pushMessage(payload);
                console.log(`Bark推送成功：${timer.title}`);
              } catch (e) {
                console.error('Bark推送失败:', e);
              }
            }
          });
        }
        const nowStr = new Date().toISOString();
        // 定期提醒逻辑
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
        // 判断是否超过截止
        if (nextTime && (!timer.repeat_until || nextTime <= timer.repeat_until)) {
          db.run('UPDATE timers SET end_time = ?, notified = 0, last_notified_at = ? WHERE id = ?', [nextTime, nowStr, timer.id]);
          console.log(`定期提醒：已推算下次提醒时间为${nextTime}`);
        } else {
          db.run('UPDATE timers SET notified = 1, last_notified_at = ? WHERE id = ?', [nowStr, timer.id]);
        }
        console.log(`已发送邮件给${toEmail}，标题：${timer.title}`);
      } catch (e) {
        console.error(`邮件发送失败（收件人：${toEmail}，标题：${timer.title}）：`, e && e.stack ? e.stack : e);
      }
    });
  });
}, 10 * 1000);

module.exports = {
  sendMail,
  initTransporter
}; 