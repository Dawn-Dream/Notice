const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
console.log('SMTP_HOST:', process.env.SMTP_HOST);
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const sqlite3 = require('sqlite3');
const { initDatabase } = require('./db-init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(routes);

// 单页应用 history 路由兜底
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 自动初始化数据库
initDatabase().then(() => {
  console.log('数据库初始化完成');
  // 这里再加载 mailer，保证表已建好
  require('./mailer');
  app.listen(PORT, () => {
    console.log(`后端服务已启动，端口：${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
}); 