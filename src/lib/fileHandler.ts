import type { AttachedFile } from '../store/conversationStore'

export interface ProcessedFile {
  meta: AttachedFile
  // For images: base64 data URL
  // For text: raw text content
  // For others: undefined
  content?: string
  mimeType: string
}

const TEXT_EXTS = new Set([
  'txt','md','markdown','json','js','ts','jsx','tsx','py','rb','go',
  'rs','java','c','cpp','h','hpp','cs','php','swift','kt','sh','bash',
  'zsh','fish','html','htm','css','scss','sass','less','xml','yaml',
  'yml','toml','ini','env','csv','sql','graphql','vue','svelte',
])

export function getFileKind(file: File): AttachedFile['kind'] {
  if (file.type.startsWith('image/')) return 'image'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (TEXT_EXTS.has(ext)) return 'text'
  return 'other'
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file, 'utf-8')
  })
}

export async function processFile(file: File): Promise<ProcessedFile> {
  const kind = getFileKind(file)
  const meta: AttachedFile = {
    name: file.name,
    kind,
    size: file.size,
  }

  if (kind === 'image') {
    const content = await readFileAsBase64(file)
    meta.previewUrl = content
    return { meta, content, mimeType: file.type }
  }

  if (kind === 'text') {
    const content = await readFileAsText(file)
    return { meta, content, mimeType: 'text/plain' }
  }

  // other — try as text, silently fail
  try {
    const content = await readFileAsText(file)
    return { meta, content, mimeType: 'text/plain' }
  } catch {
    return { meta, mimeType: file.type }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Build the messages content for the API call, embedding files
export function buildUserContent(
  text: string,
  files: ProcessedFile[],
): string | any[] {
  const images = files.filter((f) => f.meta.kind === 'image' && f.content)
  const texts = files.filter((f) => f.meta.kind !== 'image' && f.content)

  // If no files, plain text
  if (images.length === 0 && texts.length === 0) return text

  // Build text part with file contents prepended
  let fullText = text
  for (const tf of texts) {
    const ext = tf.meta.name.split('.').pop() ?? ''
    fullText = `【文件：${tf.meta.name}】\n\`\`\`${ext}\n${tf.content}\n\`\`\`\n\n${fullText}`
  }

  if (images.length === 0) return fullText

  // Multimodal content array
  const parts: any[] = [{ type: 'text', text: fullText }]
  for (const img of images) {
    parts.push({
      type: 'image_url',
      image_url: { url: img.content! },
    })
  }
  return parts
}
