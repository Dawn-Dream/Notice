const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// 打印SMTP配置信息（注意隐藏密码）
console.log('SMTP配置:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER
});

// 这里请填写你的SMTP邮箱配置
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const db = new sqlite3.Database('./data.db');

function sendMail(to, subject, text) {
  return transporter.sendMail({
    from: process.env.SMTP_USER, // 始终用SMTP_USER作为发件人
    to,
    subject,
    text
  });
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
        await sendMail(toEmail, `倒计时提醒：${timer.title}`, timer.email_content || `您的倒计时\"${timer.title}\"已到达：${timer.end_time}`);
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

module.exports = {}; 