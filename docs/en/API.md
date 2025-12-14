# API Reference

## Base URL

API endpoints after deployment:
- Cloudflare Pages: `https://your-project.pages.dev/api`
- Vercel: `https://your-project.vercel.app/api`
- Netlify: `https://your-project.netlify.app/api`

## `GET /api/`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "message": "Z-Image API is running",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## `GET /api/providers`

Get all available providers.

**Response:**

```json
{
  "providers": [
    {
      "id": "gitee",
      "name": "Gitee AI",
      "requiresAuth": true,
      "authHeader": "X-API-Key"
    },
    {
      "id": "huggingface",
      "name": "HuggingFace",
      "requiresAuth": false,
      "authHeader": "X-HF-Token"
    },
    {
      "id": "modelscope",
      "name": "ModelScope",
      "requiresAuth": true,
      "authHeader": "X-MS-Token"
    }
  ]
}
```

## `GET /api/providers/:provider/models`

Get models supported by a specific provider.

**Path Parameters:**

| Parameter  | Type   | Description                                    |
| ---------- | ------ | ---------------------------------------------- |
| `provider` | string | Provider ID: `gitee`, `huggingface`, `modelscope` |

**Response:**

```json
{
  "provider": "gitee",
  "models": [
    {
      "id": "z-image-turbo",
      "name": "Z-Image Turbo",
      "features": ["fast", "high-quality"]
    }
  ]
}
```

## `GET /api/models`

Get all available models.

**Response:**

```json
{
  "models": [
    {
      "id": "z-image-turbo",
      "name": "Z-Image Turbo",
      "provider": "gitee",
      "features": ["fast", "high-quality"]
    }
  ]
}
```

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

**Response (Success):**

```json
{
  "imageDetails": {
    "url": "https://example.com/generated-image.png",
    "provider": "Gitee AI",
    "model": "Z-Image Turbo",
    "dimensions": "1024 x 1024 (1:1)",
    "duration": "5.2s",
    "seed": 12345,
    "steps": 9,
    "prompt": "A beautiful sunset over mountains",
    "negativePrompt": "low quality, blurry"
  }
}
```

**Response (Error):**

```json
{
  "error": "Invalid prompt",
  "code": "INVALID_PROMPT",
  "details": {
    "field": "prompt"
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | API token is required |
| `AUTH_INVALID` | 401 | Invalid API token |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 429 | API quota exceeded |
| `INVALID_PROMPT` | 400 | Invalid prompt |
| `INVALID_DIMENSIONS` | 400 | Invalid width/height |
| `PROVIDER_ERROR` | 502 | Upstream provider error |
| `TIMEOUT` | 504 | Request timed out |

**Parameters:**

| Field                 | Type   | Required | Default         | Description                         |
| --------------------- | ------ | -------- | --------------- | ----------------------------------- |
| `provider`            | string | No       | `gitee`         | Provider: `gitee`, `huggingface`, `modelscope` |
| `prompt`              | string | Yes      | -               | Image description (max 10000 chars) |
| `negativePrompt`      | string | No       | `""`            | What to avoid (or use `negative_prompt`) |
| `model`               | string | No       | `z-image-turbo` | Model name                          |
| `width`               | number | No       | `1024`          | Image width (256-2048)              |
| `height`              | number | No       | `1024`          | Image height (256-2048)             |
| `steps`               | number | No       | `9`             | Generation steps (1-50), or use `num_inference_steps` |
| `seed`                | number | No       | random          | Random seed for reproducibility     |
| `guidanceScale`       | number | No       | -               | Guidance scale, controls prompt influence on output |

## Providers

> For complete provider and model details, see **[Providers & Models](./PROVIDERS.md)**.

| Provider | Auth Header | Image Format | Models |
|----------|-------------|--------------|--------|
| Gitee AI | `X-API-Key` | PNG | `z-image-turbo` |
| HuggingFace | `X-HF-Token` | **WebP** | `flux-schnell`, `stable-diffusion-3.5-large` |
| ModelScope | `X-MS-Token` | PNG | `flux-schnell` |

### Gitee AI
- **Header**: `X-API-Key`
- **Models**: `z-image-turbo`
- **Image Format**: PNG
- **Get API Key**: [ai.gitee.com](https://ai.gitee.com)

### HuggingFace
- **Header**: `X-HF-Token` (optional, rate limited without token)
- **Models**: `flux-schnell`, `stable-diffusion-3.5-large`
- **Image Format**: WebP
- **Get Token**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### ModelScope
- **Header**: `X-MS-Token`
- **Models**: `flux-schnell`
- **Image Format**: PNG
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

## `GET /api/llm-providers`

Get all available LLM providers for prompt optimization.

**Response:**

```json
{
  "providers": [
    {
      "id": "pollinations",
      "name": "Pollinations AI",
      "needsAuth": false,
      "models": [
        { "id": "openai", "name": "OpenAI", "description": "Fast general-purpose model" }
      ]
    },
    {
      "id": "huggingface-llm",
      "name": "HuggingFace",
      "needsAuth": false,
      "authHeader": "X-HF-Token",
      "models": [
        { "id": "Qwen/Qwen2.5-72B-Instruct", "name": "Qwen 2.5 72B", "description": "Powerful instruction-following model" }
      ]
    },
    {
      "id": "gitee-llm",
      "name": "Gitee AI",
      "needsAuth": true,
      "authHeader": "X-API-Key",
      "models": [
        { "id": "DeepSeek-V3.2", "name": "DeepSeek V3.2", "description": "Latest DeepSeek model" }
      ]
    },
    {
      "id": "modelscope-llm",
      "name": "ModelScope",
      "needsAuth": true,
      "authHeader": "X-MS-Token",
      "models": [
        { "id": "deepseek-ai/DeepSeek-V3.2", "name": "DeepSeek V3.2", "description": "Latest DeepSeek model on ModelScope" }
      ]
    },
    {
      "id": "deepseek",
      "name": "DeepSeek Official",
      "needsAuth": true,
      "authHeader": "X-DeepSeek-Token",
      "models": [
        { "id": "deepseek-chat", "name": "DeepSeek Chat", "description": "General chat model" }
      ]
    }
  ]
}
```

## `POST /api/optimize`

Optimize an image prompt using LLM to enhance its quality for image generation.

**Headers:**

```
Content-Type: application/json
X-HF-Token: your-huggingface-token      # For huggingface-llm provider (optional)
X-API-Key: your-gitee-api-key           # For gitee-llm provider
X-MS-Token: your-modelscope-token       # For modelscope-llm provider
X-DeepSeek-Token: your-deepseek-token   # For deepseek provider
```

**Request Body:**

```json
{
  "prompt": "a cat",
  "provider": "pollinations",
  "lang": "en",
  "model": "openai",
  "systemPrompt": "You are an expert AI image prompt engineer..."
}
```

**Parameters:**

| Field          | Type   | Required | Default        | Description                                      |
| -------------- | ------ | -------- | -------------- | ------------------------------------------------ |
| `prompt`       | string | Yes      | -              | The prompt to optimize (max 4000 chars)          |
| `provider`     | string | No       | `pollinations` | LLM provider: `pollinations`, `huggingface-llm`, `gitee-llm`, `modelscope-llm`, `deepseek` |
| `lang`         | string | No       | `en`           | Output language: `en` or `zh`                    |
| `model`        | string | No       | Provider default | Model ID to use                                |
| `systemPrompt` | string | No       | Built-in       | Custom system prompt for optimization            |

**Response (Success):**

```json
{
  "optimized": "A fluffy orange tabby cat with emerald green eyes, sitting gracefully on a weathered wooden windowsill, soft golden hour sunlight streaming through vintage lace curtains, creating warm bokeh in the background, photorealistic, 8K resolution, shallow depth of field",
  "provider": "pollinations",
  "model": "openai"
}
```

**Response (Error):**

```json
{
  "error": "API token is required for Gitee AI",
  "code": "AUTH_REQUIRED",
  "details": {
    "provider": "gitee-llm"
  }
}
```

**LLM Providers:**

| Provider | Auth Header | Default Model | Free |
|----------|-------------|---------------|------|
| Pollinations | None | `openai` | Yes |
| HuggingFace | `X-HF-Token` (optional) | `Qwen/Qwen2.5-72B-Instruct` | Yes (rate limited without token) |
| Gitee AI | `X-API-Key` | `DeepSeek-V3.2` | No (uses existing Gitee token) |
| ModelScope | `X-MS-Token` | `deepseek-ai/DeepSeek-V3.2` | No (uses existing ModelScope token) |
| DeepSeek Official | `X-DeepSeek-Token` | `deepseek-chat` | No |

## `POST /api/translate`

Translate a prompt from Chinese to English for better image generation results.

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "prompt": "一只在雪地里奔跑的金毛犬"
}
```

**Parameters:**

| Field    | Type   | Required | Description                              |
| -------- | ------ | -------- | ---------------------------------------- |
| `prompt` | string | Yes      | The prompt to translate (max 2000 chars) |

**Response (Success):**

```json
{
  "translated": "A golden retriever running in the snow",
  "model": "openai-fast"
}
```

**Response (Error):**

```json
{
  "error": "Prompt is required",
  "code": "INVALID_PROMPT"
}
```

**Notes:**
- Uses Pollinations AI with `openai-fast` model
- Free to use, no authentication required
- If the input is already in English, it will be returned as-is
- Designed specifically for AI image generation prompts

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

# Prompt Optimization (Free - Pollinations)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cat",
    "provider": "pollinations",
    "lang": "en"
  }'

# Prompt Optimization (HuggingFace - free with optional token)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -H "X-HF-Token: your-hf-token" \
  -d '{
    "prompt": "a cat",
    "provider": "huggingface-llm",
    "lang": "en"
  }'

# Prompt Optimization (Gitee AI)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gitee-api-key" \
  -d '{
    "prompt": "a cat",
    "provider": "gitee-llm",
    "lang": "en"
  }'

# Prompt Optimization (ModelScope)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -H "X-MS-Token: your-modelscope-token" \
  -d '{
    "prompt": "a cat",
    "provider": "modelscope-llm",
    "lang": "zh"
  }'

# Prompt Translation (Chinese to English - Free)
curl -X POST https://your-project.pages.dev/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只在雪地里奔跑的金毛犬"
  }'
```

### JavaScript (fetch)

```javascript
// Image Generation
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
console.log(data.imageDetails.url);

// Prompt Optimization (Free)
const optimizeResponse = await fetch('https://your-project.pages.dev/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'a cat sitting on a window',
    provider: 'pollinations',
    lang: 'en',
  }),
});

const optimized = await optimizeResponse.json();
console.log(optimized.optimized);
// Output: "A fluffy orange tabby cat with emerald green eyes, sitting gracefully on a weathered wooden windowsill..."

// Prompt Optimization with Gitee AI
const giteeOptimize = await fetch('https://your-project.pages.dev/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-gitee-api-key',
  },
  body: JSON.stringify({
    prompt: '一只猫',
    provider: 'gitee-llm',
    lang: 'zh',
  }),
});

const giteeResult = await giteeOptimize.json();
console.log(giteeResult.optimized);

// Prompt Translation (Chinese to English - Free)
const translateResponse = await fetch('https://your-project.pages.dev/api/translate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: '一只在雪地里奔跑的金毛犬',
  }),
});

const translated = await translateResponse.json();
console.log(translated.translated);
// Output: "A golden retriever running in the snow"
```

### Python

```python
import requests

# Image Generation
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
print(data['imageDetails']['url'])

# Prompt Optimization (Free - Pollinations)
optimize_response = requests.post(
    'https://your-project.pages.dev/api/optimize',
    headers={
        'Content-Type': 'application/json',
    },
    json={
        'prompt': 'a cat',
        'provider': 'pollinations',
        'lang': 'en',
    }
)

result = optimize_response.json()
print(result['optimized'])

# Prompt Optimization with Gitee AI
gitee_optimize = requests.post(
    'https://your-project.pages.dev/api/optimize',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-gitee-api-key',
    },
    json={
        'prompt': '一只猫',
        'provider': 'gitee-llm',
        'lang': 'zh',
    }
)

print(gitee_optimize.json()['optimized'])

# Prompt Translation (Chinese to English - Free)
translate_response = requests.post(
    'https://your-project.pages.dev/api/translate',
    headers={
        'Content-Type': 'application/json',
    },
    json={
        'prompt': '一只在雪地里奔跑的金毛犬',
    }
)

print(translate_response.json()['translated'])
# Output: "A golden retriever running in the snow"
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
