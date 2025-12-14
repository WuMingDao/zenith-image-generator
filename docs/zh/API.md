# API 参考

## 基础 URL

部署后的 API 地址：
- Cloudflare Pages: `https://your-project.pages.dev/api`
- Vercel: `https://your-project.vercel.app/api`
- Netlify: `https://your-project.netlify.app/api`

## `GET /api/`

健康检查端点。

**响应：**

```json
{
  "status": "ok",
  "message": "Z-Image API is running",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## `GET /api/providers`

获取所有可用的 Provider 列表。

**响应：**

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

获取指定 Provider 支持的模型列表。

**路径参数：**

| 参数       | 类型   | 描述                                       |
| ---------- | ------ | ------------------------------------------ |
| `provider` | string | Provider ID: `gitee`, `huggingface`, `modelscope` |

**响应：**

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

获取所有可用的模型列表。

**响应：**

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

统一的图片生成接口，支持多个 AI Provider。

**请求头：**

```
Content-Type: application/json
X-API-Key: your-gitee-ai-api-key      # Gitee AI
X-HF-Token: your-huggingface-token    # HuggingFace (可选)
X-MS-Token: your-modelscope-token     # ModelScope (可选)
```

**请求体：**

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

**响应（成功）：**

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

**响应（错误）：**

```json
{
  "error": "Invalid prompt",
  "code": "INVALID_PROMPT",
  "details": {
    "field": "prompt"
  }
}
```

**错误码：**

| 错误码 | HTTP 状态码 | 描述 |
|--------|-------------|------|
| `AUTH_REQUIRED` | 401 | 需要 API Token |
| `AUTH_INVALID` | 401 | 无效的 API Token |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `QUOTA_EXCEEDED` | 429 | API 配额已用尽 |
| `INVALID_PROMPT` | 400 | 无效的提示词 |
| `INVALID_DIMENSIONS` | 400 | 无效的宽度/高度 |
| `PROVIDER_ERROR` | 502 | 上游服务错误 |
| `TIMEOUT` | 504 | 请求超时 |

**参数：**

| 字段                  | 类型   | 必填 | 默认值          | 描述                                |
| --------------------- | ------ | ---- | --------------- | ----------------------------------- |
| `provider`            | string | 否   | `gitee`         | Provider: `gitee`, `huggingface`, `modelscope` |
| `prompt`              | string | 是   | -               | 图片描述 (最多 10000 字符)          |
| `negativePrompt`      | string | 否   | `""`            | 负面提示词 (或使用 `negative_prompt`) |
| `model`               | string | 否   | `z-image-turbo` | 模型名称                            |
| `width`               | number | 否   | `1024`          | 图片宽度 (256-2048)                 |
| `height`              | number | 否   | `1024`          | 图片高度 (256-2048)                 |
| `steps`               | number | 否   | `9`             | 生成步数 (1-50)，也可使用 `num_inference_steps` |
| `seed`                | number | 否   | 随机            | 随机种子，用于复现结果              |
| `guidanceScale`       | number | 否   | -               | 引导比例，控制提示词对生成结果的影响程度 |

## Providers

> 完整的供应商和模型详情，请参阅 **[供应商与模型](./PROVIDERS.md)**。

| Provider | 认证请求头 | 图片格式 | 模型 |
|----------|------------|----------|------|
| Gitee AI | `X-API-Key` | PNG | `z-image-turbo` |
| HuggingFace | `X-HF-Token` | **WebP** | `flux-schnell`, `stable-diffusion-3.5-large` |
| ModelScope | `X-MS-Token` | PNG | `flux-schnell` |

### Gitee AI
- **请求头**: `X-API-Key`
- **模型**: `z-image-turbo`
- **图片格式**: PNG
- **获取 API Key**: [ai.gitee.com](https://ai.gitee.com)

### HuggingFace
- **请求头**: `X-HF-Token` (可选，无 token 有速率限制)
- **模型**: `flux-schnell`, `stable-diffusion-3.5-large`
- **图片格式**: WebP
- **获取 Token**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### ModelScope
- **请求头**: `X-MS-Token`
- **模型**: `flux-schnell`
- **图片格式**: PNG
- **获取 Token**: [modelscope.cn](https://modelscope.cn)

## `POST /api/generate-hf` (旧版)

HuggingFace 专用接口（向后兼容）。

**请求头：**

```
Content-Type: application/json
X-HF-Token: your-huggingface-token (可选)
```

## `POST /api/upscale`

使用 RealESRGAN 进行 4x 图片放大。

**请求体：**

```json
{
  "url": "https://example.com/image.png",
  "scale": 4
}
```

## `GET /api/llm-providers`

获取所有可用的 LLM Provider（用于提示词优化）。

**响应：**

```json
{
  "providers": [
    {
      "id": "pollinations",
      "name": "Pollinations AI",
      "needsAuth": false,
      "models": [
        { "id": "openai", "name": "OpenAI", "description": "快速通用模型" }
      ]
    },
    {
      "id": "huggingface-llm",
      "name": "HuggingFace",
      "needsAuth": false,
      "authHeader": "X-HF-Token",
      "models": [
        { "id": "Qwen/Qwen2.5-72B-Instruct", "name": "Qwen 2.5 72B", "description": "强大的指令跟随模型" }
      ]
    },
    {
      "id": "gitee-llm",
      "name": "Gitee AI",
      "needsAuth": true,
      "authHeader": "X-API-Key",
      "models": [
        { "id": "DeepSeek-V3.2", "name": "DeepSeek V3.2", "description": "最新 DeepSeek 模型" }
      ]
    },
    {
      "id": "modelscope-llm",
      "name": "ModelScope",
      "needsAuth": true,
      "authHeader": "X-MS-Token",
      "models": [
        { "id": "deepseek-ai/DeepSeek-V3.2", "name": "DeepSeek V3.2", "description": "ModelScope 上的最新 DeepSeek 模型" }
      ]
    },
    {
      "id": "deepseek",
      "name": "DeepSeek 官方",
      "needsAuth": true,
      "authHeader": "X-DeepSeek-Token",
      "models": [
        { "id": "deepseek-chat", "name": "DeepSeek Chat", "description": "通用对话模型" }
      ]
    }
  ]
}
```

## `POST /api/optimize`

使用 LLM 优化图像提示词，提升生成质量。

**请求头：**

```
Content-Type: application/json
X-HF-Token: your-huggingface-token      # huggingface-llm provider (可选)
X-API-Key: your-gitee-api-key           # gitee-llm provider
X-MS-Token: your-modelscope-token       # modelscope-llm provider
X-DeepSeek-Token: your-deepseek-token   # deepseek provider
```

**请求体：**

```json
{
  "prompt": "一只猫",
  "provider": "pollinations",
  "lang": "zh",
  "model": "openai",
  "systemPrompt": "你是一个专业的 AI 图像提示词工程师..."
}
```

**参数：**

| 字段           | 类型   | 必填 | 默认值         | 描述                                             |
| -------------- | ------ | ---- | -------------- | ------------------------------------------------ |
| `prompt`       | string | 是   | -              | 需要优化的提示词 (最多 4000 字符)                |
| `provider`     | string | 否   | `pollinations` | LLM 提供商: `pollinations`, `huggingface-llm`, `gitee-llm`, `modelscope-llm`, `deepseek` |
| `lang`         | string | 否   | `en`           | 输出语言: `en` (英文) 或 `zh` (中文)             |
| `model`        | string | 否   | 提供商默认     | 使用的模型 ID                                    |
| `systemPrompt` | string | 否   | 内置           | 自定义系统提示词                                 |

**响应（成功）：**

```json
{
  "optimized": "一只毛茸茸的橘色虎斑猫，拥有翠绿色的眼睛，优雅地坐在古旧木质窗台上，温暖的黄金时刻阳光穿过复古蕾丝窗帘，背景呈现柔和的虚化效果，超写实风格，8K 分辨率，浅景深",
  "provider": "pollinations",
  "model": "openai"
}
```

**响应（错误）：**

```json
{
  "error": "API token is required for Gitee AI",
  "code": "AUTH_REQUIRED",
  "details": {
    "provider": "gitee-llm"
  }
}
```

**LLM 提供商：**

| Provider | 认证请求头 | 默认模型 | 免费 |
|----------|------------|----------|------|
| Pollinations | 无 | `openai` | 是 |
| HuggingFace | `X-HF-Token` (可选) | `Qwen/Qwen2.5-72B-Instruct` | 是 (无 Token 有速率限制) |
| Gitee AI | `X-API-Key` | `DeepSeek-V3.2` | 否 (复用现有 Gitee Token) |
| ModelScope | `X-MS-Token` | `deepseek-ai/DeepSeek-V3.2` | 否 (复用现有 ModelScope Token) |
| DeepSeek 官方 | `X-DeepSeek-Token` | `deepseek-chat` | 否 |

## `POST /api/translate`

将中文提示词翻译成英文，以获得更好的图像生成效果。

**请求头：**

```
Content-Type: application/json
```

**请求体：**

```json
{
  "prompt": "一只在雪地里奔跑的金毛犬"
}
```

**参数：**

| 字段     | 类型   | 必填 | 描述                           |
| -------- | ------ | ---- | ------------------------------ |
| `prompt` | string | 是   | 需要翻译的提示词 (最多 2000 字符) |

**响应（成功）：**

```json
{
  "translated": "A golden retriever running in the snow",
  "model": "openai-fast"
}
```

**响应（错误）：**

```json
{
  "error": "Prompt is required",
  "code": "INVALID_PROMPT"
}
```

**说明：**
- 使用 Pollinations AI 的 `openai-fast` 模型
- 免费使用，无需认证
- 如果输入已经是英文，将原样返回
- 专门针对 AI 图像生成提示词进行优化

## 使用示例

### cURL

```bash
# Gitee AI
curl -X POST https://your-project.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gitee-api-key" \
  -d '{
    "provider": "gitee",
    "prompt": "一只可爱的猫",
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
    "prompt": "一只可爱的猫"
  }'

# 提示词优化 (免费 - Pollinations)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只猫",
    "provider": "pollinations",
    "lang": "zh"
  }'

# 提示词优化 (HuggingFace - 免费，可选 Token)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -H "X-HF-Token: your-hf-token" \
  -d '{
    "prompt": "一只猫",
    "provider": "huggingface-llm",
    "lang": "zh"
  }'

# 提示词优化 (Gitee AI)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gitee-api-key" \
  -d '{
    "prompt": "一只猫",
    "provider": "gitee-llm",
    "lang": "zh"
  }'

# 提示词优化 (ModelScope)
curl -X POST https://your-project.pages.dev/api/optimize \
  -H "Content-Type: application/json" \
  -H "X-MS-Token: your-modelscope-token" \
  -d '{
    "prompt": "一只猫",
    "provider": "modelscope-llm",
    "lang": "zh"
  }'

# 提示词翻译 (中文转英文 - 免费)
curl -X POST https://your-project.pages.dev/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只在雪地里奔跑的金毛犬"
  }'
```

### JavaScript (fetch)

```javascript
// 图像生成
const response = await fetch('https://your-project.pages.dev/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-gitee-api-key',
  },
  body: JSON.stringify({
    provider: 'gitee',
    prompt: '美丽的风景',
    width: 1024,
    height: 1024,
  }),
});

const data = await response.json();
console.log(data.imageDetails.url);

// 提示词优化 (免费)
const optimizeResponse = await fetch('https://your-project.pages.dev/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: '一只坐在窗台上的猫',
    provider: 'pollinations',
    lang: 'zh',
  }),
});

const optimized = await optimizeResponse.json();
console.log(optimized.optimized);
// 输出: "一只毛茸茸的橘色虎斑猫，拥有翠绿色的眼睛，优雅地坐在古旧木质窗台上..."

// 使用 Gitee AI 优化提示词
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

// 提示词翻译 (中文转英文 - 免费)
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
// 输出: "A golden retriever running in the snow"
```

### Python

```python
import requests

# 图像生成
response = requests.post(
    'https://your-project.pages.dev/api/generate',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-gitee-api-key',
    },
    json={
        'provider': 'gitee',
        'prompt': '美丽的风景',
        'width': 1024,
        'height': 1024,
    }
)

data = response.json()
print(data['imageDetails']['url'])

# 提示词优化 (免费 - Pollinations)
optimize_response = requests.post(
    'https://your-project.pages.dev/api/optimize',
    headers={
        'Content-Type': 'application/json',
    },
    json={
        'prompt': '一只猫',
        'provider': 'pollinations',
        'lang': 'zh',
    }
)

result = optimize_response.json()
print(result['optimized'])

# 使用 Gitee AI 优化提示词
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

# 提示词翻译 (中文转英文 - 免费)
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
# 输出: "A golden retriever running in the snow"
```

## 支持的宽高比

| 比例  | 尺寸                                   |
| ----- | -------------------------------------- |
| 1:1   | 256×256, 512×512, 1024×1024, 2048×2048 |
| 4:3   | 1152×896, 2048×1536                    |
| 3:4   | 768×1024, 1536×2048                    |
| 3:2   | 2048×1360                              |
| 2:3   | 1360×2048                              |
| 16:9  | 1024×576, 2048×1152                    |
| 9:16  | 576×1024, 1152×2048                    |

## 安全

### API Key 存储

您的 API Key 使用 **AES-256-GCM 加密** 安全存储在浏览器中：

- Key 在保存到 localStorage 前会被加密
- 加密密钥使用 PBKDF2 (100,000 次迭代) 从浏览器指纹派生
- 即使 localStorage 被访问，没有相同的浏览器环境也无法读取 API Key
- 更换浏览器或清除浏览器数据需要重新输入 API Key

## 故障排除

### API Key 无法保存

- 确保浏览器允许 localStorage
- 检查是否在隐私/无痕模式

### CORS 错误

- Cloudflare Pages：应自动工作
- 独立部署：更新 `apps/api/wrangler.toml` 中的 `CORS_ORIGINS`

### 构建失败

- 确保安装了 Node.js 18+ 和 pnpm 9+
- 运行 `pnpm install` 更新依赖
