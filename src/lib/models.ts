export interface ModelConfig {
  id: string
  name: string
  provider: 'openai' | 'google'
  tier: 'free' | 'budget' | 'premium'
  capabilities: ('chat' | 'vision' | 'image-gen')[]
  description: string
}

export const MODELS: ModelConfig[] = [
  // ── Gemini 3.1 ────────────────────────────────────────────────
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'google',
    tier: 'free',
    capabilities: ['chat', 'vision'],
    description: '免费 · 速度最快 · 0.00025/K',
  },
  {
    id: 'gemini-3.1-flash-lite-preview-thinking-medium',
    name: 'Gemini 3.1 Thinking',
    provider: 'google',
    tier: 'budget',
    capabilities: ['chat', 'vision'],
    description: '思考模式 · 均衡推理',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    tier: 'premium',
    capabilities: ['chat', 'vision'],
    description: '旗舰 · 最强理解 · 0.002/K',
  },
  // ── GPT-5.4 系列 ───────────────────────────────────────────────
  {
    id: 'gpt-5.4-nano',
    name: 'GPT-5.4 Nano',
    provider: 'openai',
    tier: 'free',
    capabilities: ['chat', 'vision'],
    description: '最经济 · 0.0002/K · 6 渠道',
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    provider: 'openai',
    tier: 'budget',
    capabilities: ['chat', 'vision'],
    description: '轻量推理 · 0.00175/K',
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    provider: 'openai',
    tier: 'budget',
    capabilities: ['chat', 'vision'],
    description: '均衡 · 支持 Reasoning · 0.0025/K',
  },
  {
    id: 'gpt-5.4-pro',
    name: 'GPT-5.4 Pro',
    provider: 'openai',
    tier: 'premium',
    capabilities: ['chat', 'vision'],
    description: '旗舰 · 深度推理 · 0.09/K',
  },
  {
    id: 'gpt-5.3-chat-latest',
    name: 'GPT-5.3 Chat',
    provider: 'openai',
    tier: 'budget',
    capabilities: ['chat', 'vision'],
    description: 'GPT-5.3 Instant 指南 · 0.00175/K',
  },
  // ── 图片生成 ──────────────────────────────────────────────────
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Gemini Image',
    provider: 'google',
    tier: 'budget',
    capabilities: ['image-gen'],
    description: 'nano-banana-2 · 标准画质',
  },
  {
    id: 'gemini-3.1-flash-image-preview-4k',
    name: 'Gemini Image 4K',
    provider: 'google',
    tier: 'premium',
    capabilities: ['image-gen'],
    description: 'nano-banana-2 · 最高 4096×4096',
  },
  {
    id: 'nano-banana-pro-2k',
    name: 'Nano Banana Pro 2K',
    provider: 'google',
    tier: 'budget',
    capabilities: ['image-gen'],
    description: 'Flux 优化模型 · 最高 2K',
  },
  {
    id: 'nano-banana-pro-4k',
    name: 'Nano Banana Pro 4K',
    provider: 'google',
    tier: 'premium',
    capabilities: ['image-gen'],
    description: 'Flux 优化模型 · 最高 4K',
  },
  {
    id: 'gpt-image-2',
    name: 'GPT Image 2',
    provider: 'openai',
    tier: 'budget',
    capabilities: ['image-gen'],
    description: 'OpenAI 图像生成 · 0.4/张',
  },
]

export const ONBOARDING_MODEL = 'gemini-3.1-flash-lite-preview'
export const DEFAULT_CHAT_MODEL = 'gpt-5.4-mini'
export const DEFAULT_VISION_MODEL = 'gemini-3.1-flash-lite-preview'
export const DEFAULT_IMAGEGEN_MODEL = 'gemini-3.1-flash-image-preview'

export function getModel(id: string) {
  return MODELS.find((m) => m.id === id)
}

export function getModelsByCapability(cap: ModelConfig['capabilities'][number]) {
  return MODELS.filter((m) => m.capabilities.includes(cap))
}
