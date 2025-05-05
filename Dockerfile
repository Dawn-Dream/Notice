# 前端构建阶段
FROM node:lts-alpine3.21 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# 后端构建阶段
FROM node:lts-alpine3.21 AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend ./
COPY --from=frontend-build /app/frontend/dist ./public

# 生产运行阶段
FROM node:lts-alpine3.21
WORKDIR /app
COPY --from=backend-build /app/backend ./
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# 确保data目录存在
RUN mkdir -p /app/data

ENV PORT=3000
ENV HOST=0.0.0.0
ENV API_PROXY=http://localhost:3000

EXPOSE 3000

CMD ["/app/docker-entrypoint.sh"] 