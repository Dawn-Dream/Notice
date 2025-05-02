# 前端构建阶段
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# 后端构建阶段
FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend ./
COPY --from=frontend-build /app/frontend/dist ./public

# 生产运行阶段
FROM node:18-alpine
WORKDIR /app
COPY --from=backend-build /app/backend ./
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV PORT=3000
ENV HOST=0.0.0.0
ENV API_PROXY=http://localhost:3000

EXPOSE 3000

CMD ["/app/docker-entrypoint.sh"] 