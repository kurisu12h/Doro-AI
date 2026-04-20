import { useState, useRef, useCallback } from 'react'
import { Upload, X, Send, ImageIcon } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { getClient } from '../lib/openai'
import MessageBubble from '../components/MessageBubble'
import ModelSelector from '../components/ModelSelector'
import type { Message } from '../store/conversationStore'

let msgId = 0
const uid = () => `v-${Date.now()}-${++msgId}`

export default function VisionPage() {
  const { apiKey, visionModel, setVisionModel } = useSettingsStore()
  const [image, setImage] = useState<{ file: File; url: string; b64: string } | null>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadImage = (file: File) => {
    const url = URL.createObjectURL(file)
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1]
      setImage({ file, url, b64 })
    }
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) loadImage(file)
  }, [])

  const send = async () => {
    if (!input.trim() || !image || isStreaming || !apiKey) return
    const question = input.trim()
    setInput('')

    const userMsg: Message = {
      id: uid(), role: 'user',
      content: question,
      files: [{ name: image.file.name, kind: 'image', previewUrl: image.url, size: image.file.size }],
      timestamp: Date.now(),
    }
    const asstMsg: Message = { id: uid(), role: 'assistant', content: '', timestamp: Date.now() }
    setMessages((p) => [...p, userMsg, asstMsg])
    setIsStreaming(true)

    try {
      const client = getClient(apiKey)
      const stream = await client.chat.completions.create({
        model: visionModel, stream: true,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${image.file.type};base64,${image.b64}` } },
            { type: 'text', text: question },
          ],
        }],
      })
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) setMessages((p) => {
          const arr = [...p]
          arr[arr.length - 1] = { ...arr[arr.length - 1], content: arr[arr.length - 1].content + delta }
          return arr
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessages((p) => { const arr = [...p]; arr[arr.length - 1] = { ...arr[arr.length - 1], content: `**错误：** ${msg}` }; return arr })
    } finally {
      setIsStreaming(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-black/5 bg-white space-y-2">
        <h1 className="font-semibold text-[#1d1d1f] tracking-tight">图片识别</h1>
        <ModelSelector capability="vision" value={visionModel} onChange={setVisionModel} />
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Upload panel */}
        <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-black/5 bg-white p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">上传图片</p>
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !image && fileRef.current?.click()}
            className={`flex-1 min-h-[120px] md:min-h-[180px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative overflow-hidden ${
              dragging
                ? 'border-[#0071e3] bg-[#0071e3]/5'
                : image
                ? 'border-black/15 bg-white'
                : 'border-black/15 hover:border-[#0071e3] hover:bg-[#f5f5f7]'
            }`}
          >
            {image ? (
              <>
                <img src={image.url} alt="preview" className="w-full h-full object-contain" />
                <button
                  onClick={(e) => { e.stopPropagation(); setImage(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <ImageIcon size={26} className="text-[rgba(0,0,0,0.20)] mb-2" />
                <p className="text-xs text-[rgba(0,0,0,0.56)] text-center px-2 tracking-tight">点击或拖拽图片</p>
                <p className="text-[10px] text-[rgba(0,0,0,0.36)] mt-1">JPG / PNG / WebP</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImage(f) }} />
          {!image && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 py-2 rounded-lg border border-[#0071e3] text-sm font-medium text-[#0071e3] hover:bg-[#0071e3] hover:text-white transition-all duration-200"
            >
              <Upload size={14} />
              选择文件
            </button>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f5f7]">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-[rgba(0,0,0,0.36)] space-y-2">
                <ImageIcon size={32} className="opacity-40" />
                <p className="text-sm tracking-tight">上传图片后，在下方提问</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id} message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="px-5 py-3 border-t border-black/5 bg-white">
            {!apiKey && <p className="text-xs text-red-500 font-medium mb-2 tracking-tight">⚠ 未配置 API Key</p>}
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={image ? '描述你想了解这张图片的什么…' : '请先上传图片'}
                rows={1}
                disabled={!image || !apiKey}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-black/10 outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none disabled:opacity-40 transition-all duration-200 tracking-tight bg-white"
              />
              <button
                onClick={send}
                disabled={!input.trim() || !image || isStreaming || !apiKey}
                className="p-2.5 rounded-lg bg-[#0071e3] text-white hover:opacity-85 disabled:opacity-30 transition-all duration-200"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
