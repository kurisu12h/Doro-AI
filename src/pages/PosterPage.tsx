import { useState, useRef } from 'react'
import { Upload, Wand2, Download, Loader2, X } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { analyzeImage, editImage, generateImage } from '../lib/openai'

type Platform = 'pyq' | 'xiaohongshu' | 'taobao' | 'douyin'
type Style = 'minimal' | 'vibe' | 'sale' | 'luxury' | 'guochao' | 'tech'
type Size = '1024x1024' | '1792x1024' | '1024x1792'

const PLATFORMS: { value: Platform; label: string; size: Size; desc: string }[] = [
  { value: 'pyq',         label: '朋友圈',   size: '1024x1024', desc: '1:1 方形' },
  { value: 'xiaohongshu', label: '小红书',   size: '1024x1792', desc: '3:4 竖版' },
  { value: 'taobao',      label: '淘宝/京东', size: '1792x1024', desc: '16:9 横版' },
  { value: 'douyin',      label: '抖音封面',  size: '1024x1792', desc: '9:16 竖版' },
]

const STYLES: { value: Style; label: string; emoji: string; prompt: string }[] = [
  { value: 'minimal',  label: '简约白底', emoji: '⬜', prompt: 'minimalist clean studio photography, pure white or soft light gray background, professional product showcase, even soft lighting' },
  { value: 'vibe',     label: '氛围感',   emoji: '🌅', prompt: 'moody atmospheric lifestyle photography, soft natural bokeh, warm golden hour lighting, dreamy cinematic aesthetic' },
  { value: 'sale',     label: '促销活动', emoji: '🎉', prompt: 'vibrant festive promotional banner, bold colorful design, dynamic energetic composition, sale event commercial feel' },
  { value: 'luxury',   label: '高奢质感', emoji: '✨', prompt: 'ultra-premium luxury brand aesthetic, rich dark elegant background, dramatic chiaroscuro lighting, sophisticated high-end commercial' },
  { value: 'guochao',  label: '国潮',     emoji: '🐉', prompt: 'contemporary Chinese national trend guochao aesthetic, traditional cultural motifs blended with modern design, vibrant cultural elements' },
  { value: 'tech',     label: '科技感',   emoji: '💻', prompt: 'futuristic tech aesthetic, dark background with subtle neon accents, clean geometric composition, digital minimalism' },
]

const PHASES = ['分析产品…', '构建场景…', 'AI 渲染中…', '优化细节…']

const prepareProductFile = (url: string): Promise<File> =>
  new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 512
      const c = Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE })
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SIZE, SIZE)
      const scale = Math.min(SIZE / img.width, SIZE / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
      c.toBlob(b => res(new File([b!], 'product.png', { type: 'image/png' })), 'image/png')
    }
    img.src = url
  })

const emptyMask = (): Promise<File> =>
  new Promise((res) => {
    const c = Object.assign(document.createElement('canvas'), { width: 512, height: 512 })
    c.toBlob(b => res(new File([b!], 'mask.png', { type: 'image/png' })), 'image/png')
  })

export default function PosterPage() {
  const { apiKey, visionModel, imageGenModel } = useSettingsStore()

  const [productImg, setProductImg] = useState<{ file: File; url: string } | null>(null)
  const [productDesc, setProductDesc] = useState('')
  const [platform, setPlatform] = useState<Platform>('pyq')
  const [style, setStyle] = useState<Style>('vibe')
  const [scene, setScene] = useState('')

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState<{ url: string; platform: Platform; style: Style }[]>([])

  const fileRef = useRef<HTMLInputElement>(null)

  const loadProduct = async (file: File) => {
    setProductImg({ file, url: URL.createObjectURL(file) })
    setProductDesc('')
    if (!apiKey) return
    setIsAnalyzing(true)
    try {
      const desc = await analyzeImage(
        apiKey, visionModel, file,
        'Describe this product for AI marketing image generation in English only. Include: product type, exact colors, materials, shape, key visual features. Be concise (2 sentences max).',
      )
      setProductDesc(desc)
    } catch { /* silent — user can type manually */ }
    finally { setIsAnalyzing(false) }
  }

  const generate = async () => {
    if (isGenerating || !apiKey || (!productDesc.trim() && !scene.trim())) return
    setIsGenerating(true); setError(''); setProgress(0)

    const plat = PLATFORMS.find(p => p.value === platform)!
    const sty = STYLES.find(s => s.value === style)!

    let p = 0, pi = 0; setPhase(PHASES[0])
    const iv = setInterval(() => {
      p = Math.min(p + 1, 95); setProgress(p)
      const ni = Math.min(Math.floor(p / 25), PHASES.length - 1)
      if (ni !== pi) { pi = ni; setPhase(PHASES[pi]) }
    }, 320)

    try {
      const prompt = [
        productDesc ? `Product: ${productDesc}` : '',
        scene ? `Scene/background: ${scene}` : '',
        `Visual style: ${sty.prompt}`,
        `Format: ${plat.label} ${plat.desc} marketing image`,
        'Professional commercial photography, sharp focus, high resolution.',
        productImg ? 'Keep the product clearly visible and prominent as the main subject, preserve its appearance.' : '',
      ].filter(Boolean).join('. ')

      let url: string
      if (productImg) {
        const [imgFile, maskFile] = await Promise.all([prepareProductFile(productImg.url), emptyMask()])
        url = await editImage(apiKey, imgFile, maskFile, prompt, '1024x1024')
      } else {
        url = await generateImage(apiKey, imageGenModel, prompt, plat.size)
      }

      setResults(prev => [{ url, platform, style }, ...prev])
      setProgress(100)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试')
    } finally {
      clearInterval(iv); setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7]">
      <div className="px-5 py-3 border-b border-black/5 bg-white">
        <h1 className="font-semibold text-[#1d1d1f] tracking-tight">海报 / 场景图</h1>
        <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5 tracking-tight">上传产品图 + 选择平台风格，一键生成营销海报</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Left: config */}
          <div className="w-full lg:w-72 shrink-0 space-y-3">

            {/* Product upload */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
              <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">
                产品图 <span className="font-normal normal-case text-[rgba(0,0,0,0.28)]">（可选）</span>
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                className={`relative w-full h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-all ${productImg ? 'border-black/10' : 'border-black/15 bg-[#f5f5f7] hover:border-[#0071e3]'}`}
              >
                {productImg ? (
                  <>
                    <img src={productImg.url} className="w-full h-full object-contain" />
                    <button onClick={e => { e.stopPropagation(); setProductImg(null); setProductDesc('') }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center">
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[rgba(0,0,0,0.36)]">
                    <Upload size={22} className="opacity-50" />
                    <p className="text-xs tracking-tight">上传产品图</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadProduct(f) }} />

              <div className="relative">
                <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)}
                  placeholder="产品描述（上传后自动识别，也可手动填写）…"
                  rows={2}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none transition-all tracking-tight font-mono" />
                {isAnalyzing && <div className="absolute right-2 top-2.5"><Loader2 size={11} className="animate-spin text-[#0071e3]" /></div>}
              </div>
            </div>

            {/* Platform */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
              <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">平台 / 尺寸</p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(plat => (
                  <button key={plat.value} onClick={() => setPlatform(plat.value)}
                    style={{ border: `2px solid ${platform === plat.value ? '#0071e3' : 'transparent'}` }}
                    className={`px-3 py-2 rounded-xl text-left transition-all ${platform === plat.value ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] text-[rgba(0,0,0,0.7)] hover:bg-[#e8e8ed]'}`}>
                    <p className="text-xs font-semibold">{plat.label}</p>
                    <p className={`text-[10px] mt-0.5 ${platform === plat.value ? 'text-white/70' : 'text-[rgba(0,0,0,0.36)]'}`}>{plat.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
              <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">视觉风格</p>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)}
                    style={{ border: `2px solid ${style === s.value ? '#0071e3' : 'transparent'}` }}
                    className={`px-3 py-2 rounded-xl text-left transition-all ${style === s.value ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] text-[rgba(0,0,0,0.7)] hover:bg-[#e8e8ed]'}`}>
                    <span className="text-sm">{s.emoji}</span>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Scene */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-2">
              <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">场景补充描述</p>
              <textarea value={scene} onChange={e => setScene(e.target.value)}
                placeholder="例如：咖啡馆窗边，阳光洒落，木质桌面，旁边有一杯拿铁…"
                rows={3}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none transition-all tracking-tight" />
            </div>

            {!apiKey && <p className="text-xs text-red-500 font-medium tracking-tight">⚠ 未配置 API Key</p>}
            {error && <p className="text-xs text-red-500 tracking-tight">{error}</p>}

            {isGenerating && (
              <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-[#1d1d1f] tracking-tight">{phase}</span>
                  <span className="text-xs font-mono text-[rgba(0,0,0,0.36)]">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0071e3] rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button onClick={generate}
              disabled={(!productDesc.trim() && !scene.trim()) || isGenerating || !apiKey}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0071e3] text-white text-sm font-semibold hover:opacity-85 disabled:opacity-30 transition-all tracking-tight">
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {isGenerating ? '生成中…' : '生成海报'}
            </button>
          </div>

          {/* Right: results */}
          <div className="flex-1 w-full min-h-[300px]">
            {results.length === 0 && !isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-[rgba(0,0,0,0.36)] space-y-2">
                <div className="text-5xl">🖼️</div>
                <p className="text-sm tracking-tight">在左侧配置后点击生成</p>
                <p className="text-xs text-[rgba(0,0,0,0.28)] tracking-tight">支持上传产品图合成场景，或纯文字描述生成</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((r, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                    <img src={r.url} alt="" className="w-full object-cover"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-1 rounded-lg bg-[#f5f5f7] text-[rgba(0,0,0,0.36)]">
                          {PLATFORMS.find(p => p.value === r.platform)?.label}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-lg bg-[#f5f5f7] text-[rgba(0,0,0,0.36)]">
                          {STYLES.find(s => s.value === r.style)?.label}
                        </span>
                      </div>
                      <a href={r.url} download={`poster-${Date.now()}.png`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#0071e3] text-[#0071e3] text-xs font-medium hover:bg-[#0071e3] hover:text-white transition-all">
                        <Download size={11} /> 下载
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
