import OpenAI from 'openai'

const BASE_URL = 'https://api.bltcy.ai/v1'

let _client: OpenAI | null = null

export function getClient(apiKey: string): OpenAI {
  if (!_client || (_client as any)._apiKey !== apiKey) {
    _client = new OpenAI({
      apiKey,
      baseURL: BASE_URL,
      dangerouslyAllowBrowser: true,
    })
    ;(_client as any)._apiKey = apiKey
  }
  return _client
}

export async function streamChat(
  apiKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  try {
    const client = getClient(apiKey)
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) onChunk(delta)
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

const GEMINI_IMAGE_MODELS = new Set([
  'gemini-3.1-flash-image-preview',
  'gemini-3.1-flash-image-preview-4k',
  'gemini-3.1-flash-image-preview-2x',
  'gemini-3.1-flash-image-preview-512px',
])

export async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
): Promise<string> {
  const client = getClient(apiKey)

  // Gemini image models go through chat/completions with modalities
  if (GEMINI_IMAGE_MODELS.has(model)) {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      // @ts-expect-error -- bltcy extension field
      modalities: ['image'],
    })
    const content = response.choices[0]?.message?.content
    // Response may be a data-URL or base64 string
    if (typeof content === 'string') {
      if (content.startsWith('data:')) return content
      if (content.startsWith('http')) return content
      return `data:image/png;base64,${content}`
    }
    // Content may be an array with image_url parts
    if (Array.isArray(content)) {
      for (const part of content as any[]) {
        if (part?.type === 'image_url' && part.image_url?.url) return part.image_url.url
        if (part?.type === 'image' && part.data) return `data:image/png;base64,${part.data}`
      }
    }
    throw new Error('Gemini 图片模型未返回图片内容')
  }

  // gpt-image-2: uses images.generate, returns b64_json
  if (model === 'gpt-image-2') {
    const response = await client.images.generate({
      model,
      prompt,
      n: 1,
      size,
      response_format: 'b64_json',
    } as Parameters<typeof client.images.generate>[0])
    const item = (response.data ?? [])[0] as any
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
    if (item?.url) return item.url
    throw new Error('gpt-image-2 未返回图片数据')
  }

  // Fallback: standard images.generate (url)
  const response = await client.images.generate({
    model,
    prompt,
    n: 1,
    size,
  })
  const url = (response.data ?? [])[0]?.url
  if (!url) throw new Error('未返回图片地址')
  return url
}
