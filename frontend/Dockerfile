# 오너: DevOps (T-023) · 빌드 컨텍스트 = 리포 루트(nginx 설정을 같이 넣는다) · compose의 build.context: . 와 짝
FROM node:20.18-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# 같은 출처(nginx 프록시)라 빈 문자열 — "/api"를 넣으면 /api/api/… 가 된다 (SPEC §1 프론트 env)
ENV VITE_API_URL=""
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
