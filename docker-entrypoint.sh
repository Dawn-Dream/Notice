#!/bin/sh
# 自动初始化数据库（仅首次）
if [ ! -f /app/data/data.db ]; then
  echo "数据库不存在，正在初始化..."
  node /app/db-init.js
else
  echo "数据库已存在，跳过初始化"
fi

# 启动服务
exec node /app/index.js 