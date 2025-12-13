<div align="center">

# Zenith Image Generator

**Modern Text-to-Image Generation Web App**

A sleek, dark-mode AI image generator with multiple providers, <br/>
batch generation, and one-click deployment to Cloudflare Pages.

[中文](./README.zh.md) · [Changelog](./docs/CHANGELOG.md) · [Live Demo](https://zenith-image-generator.pages.dev)

![Dark Mode UI](https://img.shields.io/badge/UI-Dark%20Mode-1a1a1a)
![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Hono](https://img.shields.io/badge/Hono-4-E36002)

</div>

---

## Features

- **Multiple AI Providers** - Gitee AI, HuggingFace Spaces, ModelScope
- **Dark Mode UI** - Gradio-style with frosted glass effects
- **Flexible Sizing** - Multiple aspect ratios (1:1, 16:9, 9:16, 4:3, etc.)
- **4x Upscaling** - RealESRGAN integration
- **Secure Storage** - API keys encrypted with AES-256-GCM
- **Flow Mode** - Visual canvas for batch generation (experimental)
  - Local image caching with IndexedDB blob storage
  - Dual limits: 500 images or 4GB max storage
  - LRU cleanup with user confirmation before deletion
  - Download all images before cleanup

## Quick Start

### Prerequisites

- Node.js 18+ / pnpm 9+
- [Gitee AI API Key](https://ai.gitee.com)

### One-Click Deploy

[![Deploy to Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dash.cloudflare.com)
[![Deploy to Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/new)
[![Deploy to Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://app.netlify.com/start)

> See [Deployment Guide](./docs/en/DEPLOYMENT.md) for detailed instructions.

### Local Development

```bash
git clone https://github.com/WuMingDao/zenith-image-generator.git
cd zenith-image-generator
pnpm install

# Terminal 1
pnpm dev:api

# Terminal 2
pnpm dev:web
```

Open `http://localhost:5173`

📖 **[Full Development Guide](./docs/en/CONTRIBUTING.md)**

## API Usage

After deployment, you can call the API directly:

```bash
curl -X POST https://your-project.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gitee-api-key" \
  -d '{"prompt": "a cute cat", "width": 1024, "height": 1024}'
```

📖 **[Full API Reference](./docs/en/API.md)** - Providers, parameters, code examples

## Documentation

| Doc                                       | Description                          |
| ----------------------------------------- | ------------------------------------ |
| [Contributing](./docs/en/CONTRIBUTING.md) | Local setup, LAN access, development |
| [Deployment](./docs/en/DEPLOYMENT.md)     | Cloudflare, Vercel, Netlify guides   |
| [API Reference](./docs/en/API.md)         | Endpoints, parameters, code examples |
| [Providers & Models](./docs/en/PROVIDERS.md) | All providers and model details   |

## Security

### How Your API Keys Are Protected

```
Browser ──HTTPS──→ Cloudflare Workers ──HTTPS──→ AI Provider (Gitee/HuggingFace)
   ↑                      ↑
AES-256-GCM          Proxy Layer
encrypted            (your deployment)
```

- **Local Encryption**: API keys are encrypted with AES-256-GCM before storing in localStorage
- **Transport Security**: All communications use HTTPS encryption
- **Proxy Architecture**: Your keys are sent to your own Workers, not directly to AI providers

### ⚠️ Third-Party Deployment Warning

> **Important**: If you use someone else's deployed instance, the operator can potentially access your API keys.

This is because:

1. The deployment owner can add logging code to capture request headers
2. You cannot verify what code is actually deployed (even if the repo is open source)
3. Cloudflare provides tools like `wrangler tail` that can inspect live requests

**Recommendations**:

| Scenario | Risk Level | Recommendation |
|----------|------------|----------------|
| Self-hosted deployment | ✅ Safe | Full control over your keys |
| Third-party instance | ⚠️ Risky | Use disposable/low-balance keys only |
| Unknown source | ❌ Unsafe | Do not enter valuable API keys |

**For maximum security, always deploy your own instance.**

## Tech Stack

| Layer    | Tech                                    |
| -------- | --------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS, shadcn/ui |
| Backend  | Hono (TypeScript)                       |
| Deploy   | Cloudflare Pages, Vercel, Netlify       |

## License

MIT

## Acknowledgments

- [Gitee AI](https://ai.gitee.com) - z-image-turbo model
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Hono](https://hono.dev) - Web framework
