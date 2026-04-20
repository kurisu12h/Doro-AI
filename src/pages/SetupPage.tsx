import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { streamChat } from '../lib/openai'
import { ONBOARDING_MODEL } from '../lib/models'

interface OnboardMsg { role: 'assistant' | 'user'; text: string }

const SYSTEM_PROMPT = `你是 Doro AI 的引导助手，帮助用户完成初始配置。请用简洁友好的中文与用户对话。
引导步骤：介绍三大功能（文字对话、图片识别、图片生成），引导用户在下方输入框填写柏拉图平台 API Key（sk- 开头）。
注意：不要让用户在聊天框里直接输入 key，填好后告知完成即可。`

const WELCOME = `你好！我是 Doro AI 引导助手

这里有三大核心功能：

**文字对话** — GPT-5.4、Gemini 3.1 等旗舰模型，支持上传图片、代码和文本文件

**图片识别** — 上传任意图片，让 AI 深度分析

**图片生成** — 输入描述，生成高质量图片

请在下方填入你的**柏拉图平台 API Key**（sk- 开头），填好后点击保存即可开始！`

export default function SetupPage() {
  const { apiKey, setApiKey, setOnboardingDone } = useSettingsStore()
  const navigate = useNavigate()

  const [messages, setMessages] = useState<OnboardMsg[]>([{ role: 'assistant', text: WELCOME }])
  const [input, setInput] = useState('')
  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [keySaved, setKeySaved] = useState(!!apiKey)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const saveKey = () => {
    if (!keyInput.trim().startsWith('sk-')) return
    setApiKey(keyInput.trim())
    setKeySaved(true)
  }

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return
    const userText = input.trim()
    setInput('')
    const newMsgs: OnboardMsg[] = [...messages, { role: 'user', text: userText }]
    setMessages([...newMsgs, { role: 'assistant', text: '' }])
    setIsStreaming(true)

    const useKey = apiKey || keyInput.trim()
    if (!useKey) {
      setMessages([...newMsgs, { role: 'assistant', text: '请先在下方填写你的 API Key 哦' }])
      setIsStreaming(false)
      return
    }

    const firstUserIdx = newMsgs.findIndex((m) => m.role === 'user')
    const history = newMsgs.slice(firstUserIdx).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.text,
    }))

    await streamChat(
      useKey, ONBOARDING_MODEL,
      [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      (chunk) => setMessages((prev) => {
        const arr = [...prev]
        arr[arr.length - 1] = { ...arr[arr.length - 1], text: arr[arr.length - 1].text + chunk }
        return arr
      }),
      () => setIsStreaming(false),
      (err) => {
        setMessages((prev) => {
          const arr = [...prev]
          arr[arr.length - 1] = { role: 'assistant', text: `出错了：${err.message}` }
          return arr
        })
        setIsStreaming(false)
      },
    )
  }

  const finish = () => {
    if (!apiKey) return
    setOnboardingDone(true)
    navigate('/chat')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      {/* Apple Blue top bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#0071e3]" />

      <div className="w-full max-w-md overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)]" style={{ borderRadius: '12px' }}>
        {/* Header */}
        <div className="bg-[#1d1d1f] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0071e3] flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-sm tracking-tight">AI</span>
            </div>
            <div>
              <p className="text-white font-semibold tracking-tight">Doro AI</p>
              <p className="text-white/40 text-xs tracking-tight">由 Gemini 3.1 Flash Lite 提供 · 免费</p>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="h-72 overflow-y-auto p-4 space-y-3 bg-[#f5f5f7]">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#0071e3] flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-semibold">AI</span>
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap tracking-tight ${
                  m.role === 'user'
                    ? 'bg-[#1d1d1f] text-white rounded-2xl rounded-tr-sm'
                    : 'bg-white text-[#1d1d1f] rounded-2xl rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                }`}
              >
                {m.text}
                {i === messages.length - 1 && isStreaming && m.role === 'assistant' && (
                  <span className="inline-block w-1 h-3.5 ml-0.5 bg-[#0071e3] animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Chat input */}
        <div className="bg-white border-t border-black/5 px-4 py-2.5 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="和引导助手聊聊..."
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-black/10 outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all duration-200 tracking-tight"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="p-2 rounded-lg bg-[#0071e3] text-white disabled:opacity-30 hover:opacity-85 transition-all duration-200"
          >
            <Send size={16} />
          </button>
        </div>

        {/* API Key */}
        <div className="bg-white px-4 py-4 border-t border-black/[0.08] space-y-3">
          <p className="text-xs font-semibold text-[rgba(0,0,0,0.56)] uppercase tracking-wider">API Key 配置</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setKeySaved(false) }}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className="w-full text-sm px-4 py-2.5 pr-10 rounded-xl border border-black/10 outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] font-mono transition-all duration-200"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(0,0,0,0.36)] hover:text-[#1d1d1f] transition-colors"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              onClick={saveKey}
              disabled={!keyInput.trim().startsWith('sk-')}
              className="px-4 py-2 rounded-lg border border-[rgba(0,0,0,0.2)] text-sm font-medium text-[#1d1d1f] hover:bg-[#1d1d1f] hover:text-white hover:border-[#1d1d1f] disabled:opacity-30 transition-all duration-200"
            >
              {keySaved ? <CheckCircle2 size={16} className="text-green-500" /> : '保存'}
            </button>
          </div>

          <button
            onClick={finish}
            disabled={!apiKey}
            className="w-full py-3 rounded-lg bg-[#0071e3] text-white font-medium text-sm hover:opacity-85 disabled:opacity-30 transition-all duration-200 tracking-tight"
          >
            完成配置，开始使用 →
          </button>
        </div>
      </div>
    </div>
  )
}
