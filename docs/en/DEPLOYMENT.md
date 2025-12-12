# Deployment Guide

This guide covers deploying Z-Image to various platforms.

## Deployment Options

| Platform | Frontend | Backend | Use Case |
|----------|----------|---------|----------|
| **Cloudflare Pages** | ✅ | ✅ (Pages Functions) | Recommended: Full-stack, Global CDN |
| **Vercel** | ✅ | ✅ (Edge Functions) | Recommended: Full-stack, Auto CI/CD |
| **Netlify** | ✅ | ✅ (Netlify Functions) | Full-stack, Easy config |
| **CF Workers** | - | ✅ | Standalone API |
| **Docker** | ✅ | ✅ | Self-hosted |
| **Node.js** | - | ✅ | Traditional server |

---

## Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (both frontend and API)
pnpm dev

# Or start separately
pnpm dev:api   # API: http://localhost:8787
pnpm dev:web   # Web: http://localhost:5173
```

---

## 1. Cloudflare Pages (Recommended)

Full-stack deployment using Pages Functions for API.

### Option 1: Via Dashboard

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** > **Create** > **Pages**
3. Connect GitHub repository
4. Configure build settings:
   - **Build command**: `pnpm build:shared && pnpm build:web`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/`
5. Add environment variables (optional):
   - `CORS_ORIGINS`: Allowed frontend domains

### Option 2: Via CLI

```bash
# Install wrangler
pnpm add -g wrangler

# Login
wrangler login

# Deploy
pnpm deploy:cf-pages
```

### Option 3: GitHub Actions

1. Set GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN`: [Create API Token](https://dash.cloudflare.com/profile/api-tokens)
   - `CLOUDFLARE_ACCOUNT_ID`: Account ID

2. Push to `main` branch triggers auto-deploy

---

## 2. Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/zenith-image-generator)

### Option 2: Via CLI

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
cd apps/web
vercel --prod
```

### Option 3: Connect GitHub

1. Login to [Vercel Dashboard](https://vercel.com/dashboard)
2. **New Project** > Import GitHub repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build:shared && pnpm build:web`
   - **Output Directory**: `dist`

### Environment Variables

Set in Vercel Dashboard:
- `CORS_ORIGINS`: Allowed CORS origins (optional)

### ⚠️ Timeout Limits

Vercel Edge Functions free tier has 25s timeout. Generating multiple images in Flow mode may trigger `504 Gateway Timeout`.

Solutions:
- **Upgrade to Pro**: Increase timeout to 60s
- **Use Cloudflare Pages**: More lenient timeout, recommended for image generation
- **Reduce concurrency**: Generate fewer images at once in Flow mode

---

## 3. Netlify

### Option 1: One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/zenith-image-generator)

### Option 2: Via CLI

```bash
# Install Netlify CLI
pnpm add -g netlify-cli

# Login
netlify login

# Deploy
cd apps/web
netlify deploy --prod
```

### Option 3: Connect GitHub

1. Login to [Netlify Dashboard](https://app.netlify.com)
2. **Add new site** > **Import an existing project**
3. Connect GitHub repo
4. Config is preset in `netlify.toml`

---

## 4. Cloudflare Workers (Standalone API)

Deploy API separately to Cloudflare Workers.

### Option 1: Via Dashboard (Recommended)

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** > **Create** > **Worker** > **Import from Git**
3. Connect GitHub repository
4. Configure build settings:
   - **Build command**: `cd ../.. && pnpm build:shared && pnpm build:api`
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: `apps/api`
5. Non-production branch deploy command (optional): `npx wrangler versions upload`

### Option 2: Via CLI

```bash
cd apps/api

# Dev mode
pnpm cf:dev

# Deploy to production
pnpm deploy

# Deploy to staging
pnpm deploy:staging
```

### Configure Environment Variables

```bash
# Set secrets via wrangler
wrangler secret put CORS_ORIGINS
```

Or in `wrangler.toml`:

```toml
[vars]
CORS_ORIGINS = "https://your-frontend.com"
```

---

## 5. Docker

### Build Images

```bash
# Build API image
pnpm docker:build

# Build Web image
pnpm docker:build:web
```

### Run Containers

```bash
# Run API
docker run -p 8787:8787 \
  -e CORS_ORIGINS="https://your-frontend.com" \
  z-image-api

# Run Web
docker run -p 3000:80 z-image-web
```

### Docker Compose

```bash
# Start all services
docker compose up

# Dev mode (with hot reload)
docker compose --profile dev up

# Run in background
docker compose up -d
```

---

## Environment Variables

### Frontend (apps/web)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API URL (empty for same-origin) | `""` |
| `VITE_DEFAULT_PROMPT` | Default prompt | `""` |

### Backend (apps/api)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8787` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `localhost:5173,localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |

---

## Troubleshooting

### CORS Errors

Ensure `CORS_ORIGINS` includes your frontend domain:
```
CORS_ORIGINS=https://your-app.pages.dev,https://your-domain.com
```

### API Connection Failed

Check `VITE_API_URL` config:
- Same-origin deployment: Leave empty
- Standalone API: Set full URL (e.g., `https://api.your-domain.com`)

### Docker Build Failed

Run build commands from project root, as it needs access to `pnpm-workspace.yaml` and shared packages.
