# API 参考

## 基础 URL

部署后的 API 地址：
- Cloudflare Pages: `https://your-project.pages.dev/api`
- Vercel: `https://your-project.vercel.app/api`
- Netlify: `https://your-project.netlify.app/api`

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

**响应：**

```json
{
  "url": "https://...",
  "b64_json": "base64-encoded-image-data",
  "seed": 12345
}
```

**参数：**

| 字段                  | 类型   | 必填 | 默认值          | 描述                                |
| --------------------- | ------ | ---- | --------------- | ----------------------------------- |
| `provider`            | string | 否   | `gitee`         | Provider: `gitee`, `huggingface`, `modelscope` |
| `prompt`              | string | 是   | -               | 图片描述 (最多 10000 字符)          |
| `negative_prompt`     | string | 否   | `""`            | 负面提示词                          |
| `model`               | string | 否   | `z-image-turbo` | 模型名称                            |
| `width`               | number | 否   | `1024`          | 图片宽度 (256-2048)                 |
| `height`              | number | 否   | `1024`          | 图片高度 (256-2048)                 |
| `num_inference_steps` | number | 否   | `9`             | 生成步数 (1-50)                     |
| `seed`                | number | 否   | 随机            | 随机种子，用于复现结果              |

## Providers

### Gitee AI
- **请求头**: `X-API-Key`
- **模型**: `z-image-turbo`
- **获取 API Key**: [ai.gitee.com](https://ai.gitee.com)

### HuggingFace
- **请求头**: `X-HF-Token` (可选，无 token 有速率限制)
- **模型**: `flux-schnell`, `stable-diffusion-3.5-large`
- **获取 Token**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### ModelScope
- **请求头**: `X-MS-Token`
- **模型**: `flux-schnell`
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
    prompt: '美丽的风景',
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
        'prompt': '美丽的风景',
        'width': 1024,
        'height': 1024,
    }
)

data = response.json()
print(data.get('url') or data.get('b64_json'))
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
