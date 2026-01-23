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

- **Multiple AI Providers** - A4F, Gitee AI, HuggingFace Spaces, ModelScope
- **Dark Mode UI** - Gradio-style with frosted glass effects
- **Flexible Sizing** - Multiple aspect ratios (1:1, 16:9, 9:16, 4:3, etc.)
- **Secure Storage** - API keys encrypted with AES-256-GCM
- **Token Rotation** - Multiple API keys with automatic failover on rate limits
- **History (Lightweight)** - Stores metadata (URL + params) in localStorage with 24h TTL
- **Flow Mode** - Visual canvas for batch generation (experimental)
  - Images are referenced by remote URLs (no blob caching)
  - Flow state is persisted locally

## Token Rotation

Support multiple API tokens per provider for automatic rotation when hitting rate limits (429 errors).

### How to Use

Enter multiple tokens in the API settings, separated by **English commas** (`,`):

```
token_1, token_2, token_3
```

> **Note**: You must use English comma (`,`), Chinese comma (`，`) will not work.

### How It Works

1. Uses the first available token to make API requests
2. When a 429 (rate limit) error occurs, automatically switches to the next token
3. Exhausted tokens are tracked and skipped for the rest of the day
4. Token status resets daily at UTC 00:00
5. UI shows real-time token statistics (total/active/exhausted)

## Quick Start

### Prerequisites

- Node.js 18+ / pnpm 9+
- [Gitee AI API Key](https://ai.gitee.com)
- [A4F API Key](https://www.a4f.co) (optional)

### A4F (api.a4f.co) API Key

1. Register / login at https://www.a4f.co/
2. Create an API key in the A4F dashboard (see docs): https://www.a4f.co/docs
3. In Zenith Settings, select provider `A4F` and paste the key into the Token field

Notes:

- A4F requires a provider-prefixed model id (e.g. `provider-4/imagen-3.5`). Zenith exposes these in the model dropdown.
- If you call the OpenAI-compatible endpoint directly, use `model: "a4f/provider-4/imagen-3.5"` and `Authorization: Bearer a4f:<token>`.

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

# Configure environment
cp apps/web/.env.example apps/web/.env

# Terminal 1
pnpm dev:api

# Terminal 2
pnpm dev:web
```

Open `http://localhost:5173`

📖 **[Full Development Guide](./docs/en/CONTRIBUTING.md)**

## API Usage

After deployment, you can call the OpenAI-format API directly:

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gitee:your-gitee-api-key" \
  -d '{
    "model": "gitee/z-image-turbo",
    "prompt": "a cute cat",
    "size": "1024x1024",
    "steps": 9,
    "n": 1,
    "response_format": "url"
  }'
```

Notes:

- The API returns the **raw provider image URL** (e.g. HuggingFace Space `gradio_api/file=...`).
- Some provider URLs are **temporary** (HF Space files often expire around 24 hours).
- Provider routing is via the `model` prefix:
  - `a4f/...` -> A4F (`Authorization: Bearer a4f:...`)
  - `gitee/...` -> Gitee AI (`Authorization: Bearer gitee:...`)
  - `ms/...` -> ModelScope (`Authorization: Bearer ms:...`)
  - no prefix -> HuggingFace (token optional; `Authorization: Bearer <token>` or `Authorization: Bearer hf:<token>`)

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

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=WuMingDao/zenith-image-generator&type=date&legend=top-left)](https://www.star-history.com/#WuMingDao/zenith-image-generator&type=date&legend=top-left)

## License

MIT

## Acknowledgments

- [Gitee AI](https://ai.gitee.com) - z-image-turbo model
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Hono](https://hono.dev) - Web framework
