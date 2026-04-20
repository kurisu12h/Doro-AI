import { useState, useEffect, useRef } from 'react'
import { Wand2, Download, ImageIcon, Square } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { generateImage } from '../lib/openai'
import ModelSelector from '../components/ModelSelector'

type Size = '1024x1024' | '1792x1024' | '1024x1792'

interface GenResult { prompt: string; url: string; size: Size; model: string }

const SIZE_OPTIONS: { value: Size; label: string; ratio: string }[] = [
  { value: '1024x1024', label: '1:1 方形', ratio: '1024×1024' },
  { value: '1792x1024', label: '16:9 横版', ratio: '1792×1024' },
  { value: '1024x1792', label: '9:16 竖版', ratio: '1024×1792' },
]

const PHASES = [
  { at: 0,  label: '分析提示词…' },
  { at: 15, label: '生成草图…' },
  { at: 45, label: '渲染细节…' },
  { at: 78, label: '最终优化…' },
]

export default function ImageGenPage() {
  const { apiKey, imageGenModel, setImageGenModel } = useSettingsStore()
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<Size>('1024x1024')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<GenResult[]>([])
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!loading) { setProgress(0); setPhase(''); return }

    setProgress(0)
    setPhase(PHASES[0].label)
    let p = 0
    const interval = setInterval(() => {
      p = Math.min(p + 1, 95)
      setProgress(p)
      const current = [...PHASES].reverse().find((ph) => p >= ph.at)
      if (current) setPhase(current.label)
    }, 320)

    return () => clearInterval(interval)
  }, [loading])

  const generate = async () => {
    if (!prompt.trim() || loading || !apiKey) return
    setLoading(true)
    setError('')

    let cancelled = false
    abortRef.current = () => { cancelled = true }

    try {
      const url = await generateImage(apiKey, imageGenModel, prompt.trim(), size)
      if (!cancelled) {
        setProgress(100)
        setTimeout(() => {
          setResults((prev) => [{ prompt: prompt.trim(), url, size, model: imageGenModel }, ...prev])
          setLoading(false)
        }, 300)
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : '生成失败，请重试')
        setLoading(false)
      }
    }
  }

  const stop = () => {
    abortRef.current?.()
    abortRef.current = null
    setLoading(false)
    setError('已取消')
  }

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-black/5 bg-white space-y-2">
        <h1 className="font-semibold text-[#1d1d1f] tracking-tight">图片生成</h1>
        <ModelSelector capability="image-gen" value={imageGenModel} onChange={setImageGenModel} />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Input card */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
          <label className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider block">
            描述你想要的图片
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) generate() }}
            placeholder="例如：一只戴着宇航员头盔的柴犬，坐在月球上看地球，油画风格，高清…"
            rows={3}
            className="w-full text-sm px-4 py-3 rounded-xl border-0 bg-[#f5f5f7] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] resize-none transition-all duration-200 tracking-tight"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[rgba(0,0,0,0.56)] tracking-tight">尺寸：</span>
            {SIZE_OPTIONS.map((opt) => {
              const isSelected = size === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setSize(opt.value)}
                  className={`text-xs px-3 py-1.5 font-medium transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#0071e3] text-white border-[#0071e3]'
                      : 'bg-[#fafafc] text-[rgba(0,0,0,0.8)] border-[rgba(0,0,0,0.04)] hover:border-[rgba(0,0,0,0.2)]'
                  }`}
                  style={{
                    borderRadius: '11px',
                    border: isSelected ? '2px solid #0071e3' : '2px solid rgba(0,0,0,0.04)',
                  }}
                >
                  <span className="tracking-tight">{opt.label}</span>
                  <span className="ml-1 font-mono opacity-60 text-[10px]">{opt.ratio}</span>
                </button>
              )
            })}
          </div>

          {!apiKey && (
            <p className="text-xs text-red-500 font-medium tracking-tight">⚠ 未配置 API Key，请前往设置。</p>
          )}
          {error && <p className="text-xs text-red-500 tracking-tight">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={generate}
              disabled={!prompt.trim() || loading || !apiKey}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0071e3] text-white text-sm font-medium hover:opacity-85 disabled:opacity-30 transition-all duration-200 tracking-tight"
            >
              <Wand2 size={15} />
              生成图片
              {!loading && <span className="text-xs opacity-50 font-normal">Ctrl+Enter</span>}
            </button>
            {loading && (
              <button
                onClick={stop}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:opacity-75 transition-all duration-200 tracking-tight"
              >
                <Square size={14} />
                取消
              </button>
            )}
          </div>
        </div>

        {/* Progress card */}
        {loading && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#1d1d1f] tracking-tight">{phase}</p>
              <span className="text-xs font-mono text-[rgba(0,0,0,0.36)]">{progress}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0071e3] rounded-full transition-all duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Skeleton placeholder */}
            <div className="w-full aspect-square rounded-xl bg-[#f5f5f7] overflow-hidden relative">
              <div className="absolute inset-0 animate-shimmer"
                style={{
                  background: 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)',
                  backgroundSize: '200% 100%',
                }} />
            </div>
            <p className="text-xs text-[rgba(0,0,0,0.36)] tracking-tight text-center">AI 正在创作中，大约需要 20–40 秒</p>
          </div>
        )}

        {/* Empty */}
        {results.length === 0 && !loading && (
          <div className="flex flex-col items-center py-16 text-[rgba(0,0,0,0.36)] space-y-2">
            <ImageIcon size={36} className="opacity-40" />
            <p className="text-sm tracking-tight">在上方输入描述，生成你的第一张 AI 图片</p>
          </div>
        )}

        {/* Results grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map((r, i) => (
            <ResultCard key={i} result={r} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultCard({ result: r }: { result: GenResult }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      {imgError ? (
        <div className="w-full aspect-square bg-[#f5f5f7] flex flex-col items-center justify-center gap-2 text-[rgba(0,0,0,0.36)]">
          <ImageIcon size={28} className="opacity-40" />
          <p className="text-xs tracking-tight">图片加载失败</p>
        </div>
      ) : (
        <img
          src={r.url}
          alt={r.prompt}
          className="w-full object-cover"
          onError={() => setImgError(true)}
          crossOrigin="anonymous"
        />
      )}
      <div className="p-3 space-y-2">
        <p className="text-xs text-[rgba(0,0,0,0.56)] line-clamp-2 tracking-tight">{r.prompt}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-lg bg-[#f5f5f7] font-mono text-[rgba(0,0,0,0.36)]">{r.size}</span>
            <span className="text-[10px] text-[rgba(0,0,0,0.36)] tracking-tight">{r.model}</span>
          </div>
          <a
            href={r.url}
            download={`ai-${Date.now()}.png`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#0071e3] text-[#0071e3] font-medium hover:bg-[#0071e3] hover:text-white transition-all duration-200 tracking-tight"
          >
            <Download size={12} />
            下载
          </a>
        </div>
      </div>
    </div>
  )
}
