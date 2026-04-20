import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { getClient } from '../lib/openai'
import { MODELS } from '../lib/models'

export default function SettingsPage() {
  const { apiKey, setApiKey, chatModel, setChatModel, visionModel, setVisionModel, imageGenModel, setImageGenModel, setOnboardingDone } = useSettingsStore()
  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState('')

  const save = () => { setApiKey(keyInput.trim()); setTestStatus('idle') }

  const test = async () => {
    const key = keyInput.trim() || apiKey
    if (!key) return
    setTestStatus('testing'); setTestMsg('')
    try {
      const client = getClient(key)
      const res = await client.chat.completions.create({
        model: 'gemini-3.1-flash-lite-preview',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      })
      if (res.choices?.[0]?.message) { setTestStatus('ok'); setTestMsg('连接成功 ✓') }
    } catch (err) {
      setTestStatus('fail'); setTestMsg(err instanceof Error ? err.message : '验证失败')
    }
  }

  const chatModels = MODELS.filter((m) => m.capabilities.includes('chat'))
  const visionModels = MODELS.filter((m) => m.capabilities.includes('vision'))
  const imageModels = MODELS.filter((m) => m.capabilities.includes('image-gen'))

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-3">
      <h2 className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  )

  const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: typeof chatModels }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm px-4 py-2.5 rounded-xl border border-black/10 text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] bg-white transition-all duration-200 tracking-tight"
    >
      {options.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.description}</option>)}
    </select>
  )

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7]">
      <div className="px-5 py-3 border-b border-black/5 bg-white">
        <h1 className="font-semibold text-[#1d1d1f] tracking-tight">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-xl space-y-4">
        <Section title="API Key">
          <p className="text-xs text-[rgba(0,0,0,0.56)] tracking-tight">
            柏拉图平台密钥 ·{' '}
            <a href="https://api.bltcy.ai" target="_blank" rel="noreferrer"
              className="text-[#0066cc] inline-flex items-center gap-0.5 hover:underline">
              获取 Key <ExternalLink size={11} />
            </a>
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setTestStatus('idle') }}
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
          {testStatus !== 'idle' && (
            <div className={`flex items-center gap-2 text-xs font-medium tracking-tight ${testStatus === 'ok' ? 'text-green-600' : testStatus === 'fail' ? 'text-red-500' : 'text-[rgba(0,0,0,0.56)]'}`}>
              {testStatus === 'ok' && <CheckCircle2 size={13} />}
              {testStatus === 'fail' && <AlertCircle size={13} />}
              {testMsg || '验证中…'}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!keyInput.trim()}
              className="px-5 py-2 rounded-lg bg-[#0071e3] text-white text-sm font-medium hover:opacity-85 disabled:opacity-30 transition-all duration-200 tracking-tight"
            >
              保存
            </button>
            <button
              onClick={test}
              disabled={testStatus === 'testing' || (!keyInput.trim() && !apiKey)}
              className="px-5 py-2 rounded-lg border border-black/20 text-sm font-medium text-[#1d1d1f] hover:bg-[#1d1d1f] hover:text-white hover:border-[#1d1d1f] disabled:opacity-30 transition-all duration-200 tracking-tight"
            >
              {testStatus === 'testing' ? '验证中…' : '验证连接'}
            </button>
          </div>
        </Section>

        <Section title="默认模型">
          <div className="space-y-2">
            <label className="text-xs text-[rgba(0,0,0,0.56)] font-medium tracking-tight block">文字对话</label>
            <Select value={chatModel} onChange={setChatModel} options={chatModels} />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[rgba(0,0,0,0.56)] font-medium tracking-tight block">图片识别</label>
            <Select value={visionModel} onChange={setVisionModel} options={visionModels} />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[rgba(0,0,0,0.56)] font-medium tracking-tight block">图片生成</label>
            <Select value={imageGenModel} onChange={setImageGenModel} options={imageModels} />
          </div>
        </Section>

        <Section title="其他">
          <button
            onClick={() => setOnboardingDone(false)}
            className="px-5 py-2 rounded-lg border border-black/20 text-sm font-medium text-[#1d1d1f] hover:bg-[#1d1d1f] hover:text-white hover:border-[#1d1d1f] transition-all duration-200 tracking-tight"
          >
            重新运行引导流程
          </button>
        </Section>
      </div>
    </div>
  )
}
