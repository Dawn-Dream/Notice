const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
console.log('SMTP_HOST:', process.env.SMTP_HOST);
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('./mailer');
const sqlite3 = require('sqlite3');

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

const db = new sqlite3.Database('./data/data.db');

app.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
}); 