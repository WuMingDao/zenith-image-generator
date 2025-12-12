# API Reference

## Base URL

API endpoints after deployment:
- Cloudflare Pages: `https://your-project.pages.dev/api`
- Vercel: `https://your-project.vercel.app/api`
- Netlify: `https://your-project.netlify.app/api`

## `POST /api/generate`

Unified image generation endpoint supporting multiple AI providers.

**Headers:**

```
Content-Type: application/json
X-API-Key: your-gitee-ai-api-key      # Gitee AI
X-HF-Token: your-huggingface-token    # HuggingFace (optional)
X-MS-Token: your-modelscope-token     # ModelScope (optional)
```

**Request Body:**

```json
{
  "provider": "gitee",
  "prompt": "A beautiful sunset over mountains",
  "negative_prompt": "low quality, blurry",
  "model": "z-image-turbo",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 9
}
```

**Response:**

```json
{
  "url": "https://...",
  "b64_json": "base64-encoded-image-data",
  "seed": 12345
}
```

**Parameters:**

| Field                 | Type   | Required | Default         | Description                         |
| --------------------- | ------ | -------- | --------------- | ----------------------------------- |
| `provider`            | string | No       | `gitee`         | Provider: `gitee`, `huggingface`, `modelscope` |
| `prompt`              | string | Yes      | -               | Image description (max 10000 chars) |
| `negative_prompt`     | string | No       | `""`            | What to avoid in the image          |
| `model`               | string | No       | `z-image-turbo` | Model name                          |
| `width`               | number | No       | `1024`          | Image width (256-2048)              |
| `height`              | number | No       | `1024`          | Image height (256-2048)             |
| `num_inference_steps` | number | No       | `9`             | Generation steps (1-50)             |
| `seed`                | number | No       | random          | Random seed for reproducibility     |

## Providers

### Gitee AI
- **Header**: `X-API-Key`
- **Models**: `z-image-turbo`
- **Get API Key**: [ai.gitee.com](https://ai.gitee.com)

### HuggingFace
- **Header**: `X-HF-Token` (optional, rate limited without token)
- **Models**: `flux-schnell`, `stable-diffusion-3.5-large`
- **Get Token**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### ModelScope
- **Header**: `X-MS-Token`
- **Models**: `flux-schnell`
- **Get Token**: [modelscope.cn](https://modelscope.cn)

## `POST /api/generate-hf` (Legacy)

HuggingFace-specific endpoint (backward compatible).

**Headers:**

```
Content-Type: application/json
X-HF-Token: your-huggingface-token (optional)
```

## `POST /api/upscale`

Upscale an image 4x using RealESRGAN.

**Request Body:**

```json
{
  "url": "https://example.com/image.png",
  "scale": 4
}
```

## Usage Examples

### cURL

```bash
# Gitee AI
curl -X POST https://your-project.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gitee-api-key" \
  -d '{
    "provider": "gitee",
    "prompt": "a cute cat",
    "width": 1024,
    "height": 1024
  }'

# HuggingFace
curl -X POST https://your-project.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -H "X-HF-Token: your-hf-token" \
  -d '{
    "provider": "huggingface",
    "model": "flux-schnell",
    "prompt": "a cute cat"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://your-project.pages.dev/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-gitee-api-key',
  },
  body: JSON.stringify({
    provider: 'gitee',
    prompt: 'a beautiful landscape',
    width: 1024,
    height: 1024,
  }),
});

const data = await response.json();
console.log(data.url || `data:image/png;base64,${data.b64_json}`);
```

### Python

```python
import requests

response = requests.post(
    'https://your-project.pages.dev/api/generate',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-gitee-api-key',
    },
    json={
        'provider': 'gitee',
        'prompt': 'a beautiful landscape',
        'width': 1024,
        'height': 1024,
    }
)

data = response.json()
print(data.get('url') or data.get('b64_json'))
```

## Supported Aspect Ratios

| Ratio | Dimensions                             |
| ----- | -------------------------------------- |
| 1:1   | 256×256, 512×512, 1024×1024, 2048×2048 |
| 4:3   | 1152×896, 2048×1536                    |
| 3:4   | 768×1024, 1536×2048                    |
| 3:2   | 2048×1360                              |
| 2:3   | 1360×2048                              |
| 16:9  | 1024×576, 2048×1152                    |
| 9:16  | 576×1024, 1152×2048                    |

## Security

### API Key Storage

Your Gitee AI API key is stored securely in the browser using **AES-256-GCM encryption**:

- The key is encrypted before being saved to localStorage
- Encryption key is derived using PBKDF2 (100,000 iterations) from browser fingerprint
- Even if localStorage is accessed, the API key cannot be read without the same browser environment
- Changing browsers or clearing browser data will require re-entering the API key

**Implementation details** (`src/lib/crypto.ts`):

- Uses Web Crypto API (native browser cryptography)
- AES-256-GCM for authenticated encryption
- Random IV for each encryption operation
- Browser fingerprint includes: User-Agent, language, screen dimensions

**Note**: While this provides protection against casual access and XSS attacks reading raw values, for maximum security in shared environments, consider:

- Using a private/incognito window
- Clearing browser data after use
- Self-hosting with server-side API key storage

## Troubleshooting

### API Key not saving

- Make sure your browser allows localStorage
- Check if you're in private/incognito mode

### CORS errors

- For Cloudflare Pages: Should work automatically
- For separate deployments: Update `CORS_ORIGINS` in `apps/api/wrangler.toml`

### Build failures

- Ensure Node.js 18+ and pnpm 9+ are installed
- Run `pnpm install` to update dependencies
