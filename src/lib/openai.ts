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
  signal?: AbortSignal,
) {
  try {
    const client = getClient(apiKey)
    const stream = await client.chat.completions.create(
      { model, messages, stream: true },
      { signal },
    )
    for await (const chunk of stream) {
      if (signal?.aborted) break
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) onChunk(delta)
    }
    onDone()
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || signal?.aborted)) {
      onDone()
      return
    }
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

export async function analyzeImage(
  apiKey: string,
  visionModel: string,
  imageFile: File,
  promptText: string,
): Promise<string> {
  const b64 = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(imageFile)
  })
  const client = getClient(apiKey)
  const res = await client.chat.completions.create({
    model: visionModel,
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${b64}` } },
      { type: 'text', text: promptText },
    ]}],
    max_tokens: 300,
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

export async function analyzeClothingImage(
  apiKey: string,
  visionModel: string,
  imageFile: File,
  categoryEn: string,
): Promise<string> {
  const b64 = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(imageFile)
  })
  const client = getClient(apiKey)
  const res = await client.chat.completions.create({
    model: visionModel,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${b64}` } },
        { type: 'text', text: `Describe this ${categoryEn} garment for AI image generation in English only. Include: color, fabric/texture, style/fit, pattern, key design details (collar, buttons, pockets, etc), and length. Be specific. 2–3 sentences max.` },
      ],
    }],
    max_tokens: 200,
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

export async function editImage(
  apiKey: string,
  imageFile: File,
  maskFile: File | null,
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
): Promise<string> {
  const form = new FormData()
  form.append('model', 'gpt-image-2')
  form.append('image', imageFile, 'model.png')
  if (maskFile) form.append('mask', maskFile, 'mask.png')
  form.append('prompt', prompt)
  form.append('n', '1')
  form.append('size', size)

  const res = await fetch(`${BASE_URL}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  const data = await res.json()
  const item = (data.data ?? [])[0] as any
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
  if (item?.url) return item.url
  throw new Error('未返回图片数据')
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
