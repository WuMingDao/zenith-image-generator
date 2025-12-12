# Z-Image Deployment Guide

本指南介绍如何将 Z-Image 部署到各种平台。

## 部署选项概览

| 部署方式 | 前端 | 后端 | 适用场景 |
|---------|------|------|---------|
| **Cloudflare Pages** | ✅ | ✅ (Pages Functions) | 推荐：一体化部署，全球 CDN |
| **Vercel** | ✅ | ✅ (Edge Functions) | 推荐：一体化部署，自动 CI/CD |
| **Netlify** | ✅ | ✅ (Netlify Functions) | 一体化部署，易于配置 |
| **CF Workers (独立)** | - | ✅ | 独立 API 服务 |
| **Docker** | ✅ | ✅ | 自托管、私有部署 |
| **Node.js** | - | ✅ | 传统服务器部署 |

---

## 快速开始

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器 (前后端同时)
pnpm dev

# 或分别启动
pnpm dev:api   # API: http://localhost:8787
pnpm dev:web   # Web: http://localhost:5173
```

---

## 一、Cloudflare Pages (推荐)

前后端一体化部署，使用 Pages Functions 处理 API 请求。

### 方式 1：通过 Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** > **Create** > **Pages**
3. 连接 GitHub 仓库
4. 配置构建设置：
   - **Build command**: `pnpm build:shared && pnpm build:web`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/`
5. 添加环境变量（可选）：
   - `CORS_ORIGINS`: 允许的前端域名

### 方式 2：通过 CLI

```bash
# 安装 wrangler
pnpm add -g wrangler

# 登录
wrangler login

# 部署
pnpm deploy:cf-pages
```

### 方式 3：GitHub Actions (自动部署)

1. 在 GitHub 仓库设置 Secrets:
   - `CLOUDFLARE_API_TOKEN`: [创建 API Token](https://dash.cloudflare.com/profile/api-tokens)
   - `CLOUDFLARE_ACCOUNT_ID`: 账户 ID

2. 推送到 `main` 分支自动触发部署

---

## 二、Vercel

### 方式 1：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/zenith-image-generator)

### 方式 2：通过 CLI

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 部署
cd apps/web
vercel --prod
```

### 方式 3：连接 GitHub

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. **New Project** > 导入 GitHub 仓库
3. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build:shared && pnpm build:web`
   - **Output Directory**: `dist`

### 环境变量

在 Vercel Dashboard 设置：
- `CORS_ORIGINS`: 允许的 CORS 源（可选）

### ⚠️ 超时限制

Vercel Edge Functions 免费版超时限制为 25 秒。在 Flow 模式下同时生成多张图片可能会触发 `504 Gateway Timeout` 错误。

解决方案：
- **升级 Pro 计划**：可将超时时间增加到 60 秒
- **使用 Cloudflare Pages**：超时限制更宽松，推荐用于图片生成场景
- **减少并发**：Flow 模式下减少同时生成的图片数量

---

## 三、Netlify

### 方式 1：一键部署

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/zenith-image-generator)

### 方式 2：通过 CLI

```bash
# 安装 Netlify CLI
pnpm add -g netlify-cli

# 登录
netlify login

# 部署
cd apps/web
netlify deploy --prod
```

### 方式 3：连接 GitHub

1. 登录 [Netlify Dashboard](https://app.netlify.com)
2. **Add new site** > **Import an existing project**
3. 连接 GitHub 仓库
4. 配置已在 `netlify.toml` 中预设

---

## 四、Cloudflare Workers (独立 API)

将 API 单独部署到 Cloudflare Workers。

### 方式 1：通过 Dashboard（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** > **Create** > **Worker** > **Import from Git**
3. 连接 GitHub 仓库
4. 配置构建设置：
   - **Build command**: `cd ../.. && pnpm build:shared && pnpm build:api`
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: `apps/api`
5. 非生产分支部署命令（可选）：`npx wrangler versions upload`

### 方式 2：通过 CLI

```bash
cd apps/api

# 开发模式
pnpm cf:dev

# 部署到生产环境
pnpm deploy

# 部署到 staging
pnpm deploy:staging
```

### 配置环境变量

```bash
# 通过 wrangler 设置 secrets
wrangler secret put CORS_ORIGINS
```

或在 `wrangler.toml` 中配置：

```toml
[vars]
CORS_ORIGINS = "https://your-frontend.com"
```

---

## 五、Docker 部署

### 构建镜像

```bash
# 构建 API 镜像
pnpm docker:build

# 构建 Web 镜像
pnpm docker:build:web
```

### 运行容器

```bash
# 运行 API
docker run -p 8787:8787 \
  -e CORS_ORIGINS="https://your-frontend.com" \
  z-image-api

# 运行 Web (需要设置 API URL)
docker run -p 3000:80 z-image-web
```

### Docker Compose

```bash
# 启动所有服务
docker compose up

# 开发模式 (带热重载)
docker compose --profile dev up

# 后台运行
docker compose up -d
```

### 使用 GitHub Container Registry

```bash
# 拉取镜像
docker pull ghcr.io/YOUR_USERNAME/zenith-image-generator-api:latest
docker pull ghcr.io/YOUR_USERNAME/zenith-image-generator-web:latest
```

---

## 六、Node.js 部署

传统服务器部署（VPS、云服务器等）。

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 构建项目
pnpm install
pnpm build:shared
pnpm build:api

# 启动服务
cd apps/api
pm2 start "pnpm start" --name z-image-api

# 设置开机自启
pm2 save
pm2 startup
```

### 使用 systemd

创建 `/etc/systemd/system/z-image-api.service`:

```ini
[Unit]
Description=Z-Image API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/z-image/apps/api
ExecStart=/usr/bin/pnpm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=8787
Environment=CORS_ORIGINS=https://your-frontend.com

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable z-image-api
sudo systemctl start z-image-api
```

---

## 环境变量参考

### 前端 (apps/web)

| 变量 | 说明 | 默认值 |
|-----|------|-------|
| `VITE_API_URL` | API 地址（留空则使用同源） | `""` |
| `VITE_DEFAULT_PROMPT` | 默认提示词 | `""` |

### 后端 (apps/api)

| 变量 | 说明 | 默认值 |
|-----|------|-------|
| `PORT` | 服务端口 | `8787` |
| `CORS_ORIGINS` | 允许的 CORS 源（逗号分隔） | `localhost:5173,localhost:3000` |
| `NODE_ENV` | 环境模式 | `development` |

---

## CI/CD 配置

### GitHub Secrets

在仓库 Settings > Secrets and variables > Actions 中添加：

| Secret | 用途 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |

### 自动部署流程

- **CI**: 每次 push/PR 自动运行 lint、build、test
- **Cloudflare Pages**: push 到 `main` 自动部署
- **Cloudflare Workers**: API 文件变更时自动部署
- **Docker**: 发布 Release 时自动构建并推送镜像

---

## 故障排除

### CORS 错误

确保 `CORS_ORIGINS` 包含你的前端域名：
```
CORS_ORIGINS=https://your-app.pages.dev,https://your-domain.com
```

### API 连接失败

检查 `VITE_API_URL` 配置：
- 同源部署：留空
- 独立 API：设置完整 URL（如 `https://api.your-domain.com`）

### Docker 构建失败

确保在项目根目录运行构建命令，因为需要访问 `pnpm-workspace.yaml` 和共享包。

---

## 架构说明

```
请求流程 (Cloudflare Pages):
用户 → Cloudflare CDN → Pages (静态资源)
                     → Pages Functions (/api/*) → 第三方 AI API

请求流程 (独立部署):
用户 → CDN → 前端 (Vercel/Netlify)
         → API (Workers/Docker) → 第三方 AI API
```
