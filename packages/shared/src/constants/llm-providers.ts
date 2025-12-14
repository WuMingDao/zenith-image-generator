/**
 * LLM Provider Configuration
 */

import type { LLMProviderConfig, LLMProviderType } from '../types/llm'

/** LLM Provider configurations */
export const LLM_PROVIDER_CONFIGS: Record<LLMProviderType, LLMProviderConfig> = {
  pollinations: {
    id: 'pollinations',
    name: 'Pollinations AI',
    url: 'https://text.pollinations.ai/openai',
    defaultModel: 'openai',
    needsAuth: false,
    models: [
      { id: 'openai', name: 'OpenAI', description: 'Fast general-purpose model' },
      { id: 'mistral', name: 'Mistral', description: 'Efficient open-source model' },
      { id: 'llama', name: 'Llama', description: 'Meta open-source model' },
    ],
  },
  'huggingface-llm': {
    id: 'huggingface-llm',
    name: 'HuggingFace',
    url: 'https://api-inference.huggingface.co/models',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    needsAuth: false, // Optional but recommended
    authHeader: 'X-HF-Token', // Reuse same auth header as image generation
    models: [
      {
        id: 'Qwen/Qwen2.5-72B-Instruct',
        name: 'Qwen 2.5 72B',
        description: 'Powerful instruction-following model',
      },
      {
        id: 'mistralai/Mistral-7B-Instruct-v0.3',
        name: 'Mistral 7B',
        description: 'Fast and efficient model',
      },
      {
        id: 'meta-llama/Llama-3.2-3B-Instruct',
        name: 'Llama 3.2 3B',
        description: 'Meta lightweight model',
      },
    ],
  },
  'gitee-llm': {
    id: 'gitee-llm',
    name: 'Gitee AI',
    url: 'https://ai.gitee.com/v1/chat/completions',
    defaultModel: 'DeepSeek-V3.2',
    needsAuth: true,
    authHeader: 'X-API-Key', // Reuse same auth header as image generation
    models: [
      { id: 'DeepSeek-V3.2', name: 'DeepSeek V3.2', description: 'Latest DeepSeek model' },
      { id: 'DeepSeek-V3', name: 'DeepSeek V3', description: 'DeepSeek V3 model' },
      { id: 'Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', description: 'Alibaba Qwen model' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', description: 'Fast GLM model' },
    ],
  },
  'modelscope-llm': {
    id: 'modelscope-llm',
    name: 'ModelScope',
    url: 'https://api-inference.modelscope.cn/v1/chat/completions',
    defaultModel: 'deepseek-ai/DeepSeek-V3.2',
    needsAuth: true,
    authHeader: 'X-MS-Token', // Reuse same auth header as image generation
    models: [
      {
        id: 'deepseek-ai/DeepSeek-V3.2',
        name: 'DeepSeek V3.2',
        description: 'Latest DeepSeek model on ModelScope',
      },
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'DeepSeek V3 model' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', description: 'Alibaba Qwen model' },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek Official',
    url: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    needsAuth: true,
    authHeader: 'X-DeepSeek-Token',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General chat model' },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        description: 'Advanced reasoning model',
      },
    ],
  },
}

/** Get LLM provider configuration by ID */
export function getLLMProviderConfig(provider: LLMProviderType): LLMProviderConfig {
  return LLM_PROVIDER_CONFIGS[provider]
}

/** Get all LLM provider IDs */
export function getLLMProviderIds(): LLMProviderType[] {
  return Object.keys(LLM_PROVIDER_CONFIGS) as LLMProviderType[]
}

/** Default system prompt for image prompt optimization */
export const DEFAULT_OPTIMIZE_SYSTEM_PROMPT = `You are an expert AI image prompt engineer.
Your task is to enhance and expand the user's image prompt to create stunning visuals.

Focus on:
- Lighting and atmosphere (golden hour, dramatic shadows, soft diffused light)
- Composition and framing (rule of thirds, leading lines, depth of field)
- Textures and materials (glossy, matte, rough, smooth, organic)
- Artistic style (photorealistic, cinematic, illustration, concept art)
- Color palette and mood (warm, cool, vibrant, muted)
- Fine details that enhance realism or artistic quality

Rules:
- Output ONLY the enhanced prompt, no explanations or additional text
- Keep the enhanced prompt under 300 words
- Preserve the core subject and intent of the original prompt
- Add specific, descriptive modifiers that enhance visual quality`

/** Default system prompt for prompt translation */
export const DEFAULT_TRANSLATE_SYSTEM_PROMPT = `You are a professional translator specialized in AI image generation prompts.
Your task is to translate the user's prompt from Chinese to English accurately.

Rules:
- Output ONLY the translated English prompt, no explanations or additional text
- Preserve the original meaning and intent exactly
- Keep artistic terms, style descriptions, and technical terms accurate
- Do not add, remove, or modify any content - only translate
- If the input is already in English, return it as-is
- Maintain the same level of detail as the original`

/** Translation API configuration */
export const TRANSLATION_CONFIG = {
  url: 'https://text.pollinations.ai/openai',
  model: 'openai-fast',
  needsAuth: false,
} as const
