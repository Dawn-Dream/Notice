const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
require('./mailer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
});

app.use(routes); 