import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Trash2, Plus, X, ChevronDown, ChevronUp, FileText, Square } from 'lucide-react'
import { useConversationStore } from '../store/conversationStore'
import { useSettingsStore } from '../store/settingsStore'
import { streamChat } from '../lib/openai'
import { processFile, buildUserContent, formatBytes, type ProcessedFile } from '../lib/fileHandler'
import MessageBubble from '../components/MessageBubble'
import ModelSelector from '../components/ModelSelector'

export default function ChatPage() {
  const {
    conversations, activeId, newConversation, setActiveId,
    addMessage, appendToLast, setStreaming, streamingId,
    clearMessages, setModel, setSystemPrompt, active,
  } = useConversationStore()
  const conv = active()
  const isStreaming = streamingId === conv?.id
  const { apiKey } = useSettingsStore()

  useEffect(() => {
    if (!activeId || !conv) {
      const id = newConversation()
      setActiveId(id)
    }
  }, [])

  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<ProcessedFile[]>([])
  const [showSystem, setShowSystem] = useState(false)
  const [dragging, setDragging] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages])

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const processed = await Promise.all(arr.map(processFile))
    setPendingFiles((prev) => [...prev, ...processed])
  }

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const send = async () => {
    const text = input.trim()
    if ((!text && pendingFiles.length === 0) || isStreaming || !apiKey) return
    if (!conv) return

    const convId = conv.id
    const model = conv.model
    const sysPrompt = conv.systemPrompt

    const displayText = text || (pendingFiles.length > 0 ? '请分析上传的文件' : '')

    addMessage(convId, {
      role: 'user',
      content: displayText,
      files: pendingFiles.map((f) => f.meta),
    })
    addMessage(convId, { role: 'assistant', content: '' })
    setStreaming(convId)

    const userContent = buildUserContent(text || '请分析以上内容', pendingFiles)

    const historyMsgs = conv.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    setInput('')
    setPendingFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const abort = new AbortController()
    abortRef.current = abort

    await streamChat(
      apiKey,
      model,
      [
        { role: 'system', content: sysPrompt },
        ...historyMsgs,
        { role: 'user', content: userContent as any },
      ],
      (chunk) => appendToLast(convId, chunk),
      () => { setStreaming(null); abortRef.current = null },
      (err) => {
        appendToLast(convId, `\n\n> **错误：** ${err.message}`)
        setStreaming(null)
        abortRef.current = null
      },
      abort.signal,
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }, [])

  const messages = conv?.messages ?? []

  return (
    <div
      className="flex flex-col h-full bg-[#f5f5f7] relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-50 bg-[#1d1d1f]/85 flex items-center justify-center">
          <div className="text-white text-center space-y-2">
            <Paperclip size={36} className="mx-auto opacity-80" />
            <p className="text-lg font-semibold tracking-tight">松开以上传文件</p>
            <p className="text-sm text-white/60">支持图片、文本、代码等格式</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 md:px-5 py-3 border-b border-black/5 bg-white space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const id = newConversation(); setActiveId(id) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0071e3] text-[#0071e3] text-sm font-medium hover:bg-[#0071e3] hover:text-white transition-all duration-200"
            >
              <Plus size={13} />
              新对话
            </button>
            {conv && (
              <span className="text-sm font-semibold text-[#1d1d1f] truncate max-w-[120px] md:max-w-[200px] tracking-tight">
                {conv.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSystem(!showSystem)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-black/10 text-xs text-[rgba(0,0,0,0.56)] hover:border-black/20 hover:text-[#1d1d1f] transition-all duration-200"
            >
              系统提示词
              {showSystem ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {conv && (
              <button
                onClick={() => clearMessages(conv.id)}
                className="p-1.5 rounded-lg border border-black/10 text-[rgba(0,0,0,0.36)] hover:border-red-400/50 hover:text-red-500 transition-all duration-200"
                title="清空对话"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Model selector */}
        {conv && (
          <ModelSelector
            capability="chat"
            value={conv.model}
            onChange={(m) => setModel(conv.id, m)}
          />
        )}

        {/* System prompt */}
        {showSystem && conv && (
          <textarea
            value={conv.systemPrompt}
            onChange={(e) => setSystemPrompt(conv.id, e.target.value)}
            rows={2}
            className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none font-mono transition-all duration-200"
            placeholder="系统提示词…"
          />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#0071e3] flex items-center justify-center">
              <span className="text-xl font-semibold text-white tracking-tight">AI</span>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#1d1d1f] tracking-tight" style={{ letterSpacing: '-0.28px' }}>
                开始一段对话
              </p>
              <p className="text-[rgba(0,0,0,0.56)] text-sm mt-1 tracking-tight">
                当前模型：{conv?.model}
              </p>
            </div>
            <p className="text-xs text-[rgba(0,0,0,0.36)] max-w-sm tracking-tight">
              支持拖拽或点击 📎 上传图片、代码、文本文件
            </p>
          </div>
        )}
        {messages
          .filter((m) => m.role !== 'system')
          .map((msg, i, arr) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={
                streamingId === conv?.id &&
                i === arr.length - 1 &&
                msg.role === 'assistant'
              }
            />
          ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-3 md:px-5 py-3 md:py-4 border-t border-black/5 bg-white">
        {!apiKey && (
          <p className="text-xs text-red-500 mb-2 font-medium tracking-tight">
            ⚠ 未配置 API Key，请前往设置完成配置。
          </p>
        )}

        {/* Pending files */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingFiles.map((f, i) =>
              f.meta.kind === 'image' && f.meta.previewUrl ? (
                <div key={i} className="relative">
                  <img
                    src={f.meta.previewUrl}
                    alt={f.meta.name}
                    className="h-16 w-16 object-cover"
                    style={{ borderRadius: '12px' }}
                  />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-lg bg-[#f5f5f7] text-xs"
                >
                  <FileText size={12} className="text-[rgba(0,0,0,0.56)]" />
                  <span className="font-mono text-[#1d1d1f] max-w-[120px] truncate">{f.meta.name}</span>
                  <span className="text-[rgba(0,0,0,0.36)]">{formatBytes(f.meta.size)}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="p-0.5 rounded-full hover:bg-black/10 text-[rgba(0,0,0,0.36)] hover:text-[#1d1d1f] transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ),
            )}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* File button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-[#f5f5f7] text-[rgba(0,0,0,0.56)] hover:text-[#1d1d1f] transition-all duration-200 shrink-0"
            title="上传文件（图片、代码、文本…）"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
            rows={1}
            disabled={!apiKey}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-black/10 bg-white text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none transition-all duration-200 disabled:opacity-40 leading-relaxed tracking-tight"
          />

          {/* Stop / Send button */}
          {isStreaming ? (
            <button
              onClick={stop}
              className="p-2.5 rounded-lg bg-[#1d1d1f] text-white hover:opacity-75 transition-all duration-200 shrink-0"
              title="停止生成"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={(!input.trim() && pendingFiles.length === 0) || !apiKey}
              className="p-2.5 rounded-lg bg-[#0071e3] text-white hover:opacity-85 disabled:opacity-30 transition-all duration-200 shrink-0"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
