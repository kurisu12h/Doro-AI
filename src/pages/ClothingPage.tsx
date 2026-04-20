import { useState, useRef, useEffect } from 'react'
import { Upload, Wand2, Download, Loader2, Brush, Eraser, RotateCcw } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { analyzeClothingImage, editImage } from '../lib/openai'

type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes'

const CATEGORIES: { value: Category; label: string; en: string }[] = [
  { value: 'top',       label: '上衣',   en: 'top/shirt/blouse' },
  { value: 'bottom',    label: '下装',   en: 'pants/skirt/shorts' },
  { value: 'dress',     label: '连衣裙', en: 'dress/one-piece outfit' },
  { value: 'outerwear', label: '外套',   en: 'jacket/coat/outerwear' },
  { value: 'shoes',     label: '鞋子',   en: 'shoes/footwear' },
]

const SIZE = 512

// Auto-mask regions [y, height] as fraction of SIZE
const AUTO_MASK: Record<Category, [number, number]> = {
  top:       [0.15, 0.50],
  bottom:    [0.48, 0.47],
  dress:     [0.12, 0.78],
  outerwear: [0.08, 0.65],
  shoes:     [0.78, 0.22],
}

const PHASES = ['准备图片…', '生成蒙版…', 'AI 换装中…', '优化细节…']

export default function ClothingPage() {
  const { apiKey, visionModel } = useSettingsStore()

  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [refImg, setRefImg] = useState<{ file: File; url: string } | null>(null)
  const [category, setCategory] = useState<Category>('top')
  const [desc, setDesc] = useState('')
  const [brushSize, setBrushSize] = useState(40)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState<string[]>([])

  const imgCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const modelFileRef = useRef<HTMLInputElement>(null)
  const refFileRef = useRef<HTMLInputElement>(null)
  const painting = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!modelUrl) return
    const img = new Image()
    img.onload = () => {
      const c = imgCanvasRef.current!
      const m = maskCanvasRef.current!
      c.width = m.width = SIZE
      c.height = m.height = SIZE
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, SIZE, SIZE)
      const scale = Math.min(SIZE / img.width, SIZE / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
      maskCanvasRef.current!.getContext('2d')!.clearRect(0, 0, SIZE, SIZE)
    }
    img.src = modelUrl
  }, [modelUrl])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = maskCanvasRef.current!
    const r = c.getBoundingClientRect()
    const sx = SIZE / r.width, sy = SIZE / r.height
    const src = 'touches' in e ? e.touches[0] : e
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy }
  }

  const paintAt = (x: number, y: number) => {
    const ctx = maskCanvasRef.current!.getContext('2d')!
    const r = brushSize / 2
    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out'
    if (tool === 'brush') ctx.fillStyle = 'rgba(0,113,227,0.5)'
    const prev = lastPos.current
    const steps = prev ? Math.ceil(Math.hypot(x - prev.x, y - prev.y) / (r / 2)) : 1
    for (let i = 0; i <= steps; i++) {
      const px = prev ? prev.x + (x - prev.x) * (i / steps) : x
      const py = prev ? prev.y + (y - prev.y) * (i / steps) : y
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    lastPos.current = { x, y }
  }

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!modelUrl) return
    e.preventDefault()
    painting.current = true
    lastPos.current = null
    const p = getPos(e); paintAt(p.x, p.y)
  }
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!painting.current) return
    e.preventDefault()
    const p = getPos(e); paintAt(p.x, p.y)
  }
  const onUp = () => { painting.current = false; lastPos.current = null }

  const clearMask = () => maskCanvasRef.current?.getContext('2d')?.clearRect(0, 0, SIZE, SIZE)

  const toFile = (canvas: HTMLCanvasElement, name: string): Promise<File> =>
    new Promise(res => canvas.toBlob(b => res(new File([b!], name, { type: 'image/png' })), 'image/png'))

  const buildMask = async (): Promise<File> => {
    const mc = maskCanvasRef.current!
    const data = mc.getContext('2d')!.getImageData(0, 0, SIZE, SIZE)
    const hasPaint = Array.from(data.data).some((v, i) => i % 4 === 3 && v > 0)

    const off = Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE })
    const ctx = off.getContext('2d')!
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.globalCompositeOperation = 'destination-out'

    if (hasPaint) {
      ctx.drawImage(mc, 0, 0)
    } else {
      const [fy, fh] = AUTO_MASK[category]
      ctx.fillRect(0, fy * SIZE, SIZE, fh * SIZE)
    }
    return toFile(off, 'mask.png')
  }

  const analyzeRef = async () => {
    if (!refImg || !apiKey) return
    setIsAnalyzing(true); setError('')
    try {
      const cat = CATEGORIES.find(c => c.value === category)!
      setDesc(await analyzeClothingImage(apiKey, visionModel, refImg.file, cat.en))
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generate = async () => {
    if (!modelUrl || !desc.trim() || isGenerating || !apiKey) return
    setIsGenerating(true); setError(''); setProgress(0)
    let p = 0, pi = 0; setPhase(PHASES[0])
    const iv = setInterval(() => {
      p = Math.min(p + 1, 95); setProgress(p)
      const ni = Math.min(Math.floor(p / 25), PHASES.length - 1)
      if (ni !== pi) { pi = ni; setPhase(PHASES[pi]) }
    }, 320)
    try {
      const [imgFile, maskFile] = await Promise.all([
        toFile(imgCanvasRef.current!, 'model.png'),
        buildMask(),
      ])
      const cat = CATEGORIES.find(c => c.value === category)!
      const prompt = `Replace the model's ${cat.en} with: ${desc}. Preserve the model's face, hair, skin tone, pose, and background exactly. Only change the ${cat.en} garment.`
      const url = await editImage(apiKey, imgFile, maskFile, prompt)
      setResults(prev => [url, ...prev])
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
        <h1 className="font-semibold text-[#1d1d1f] tracking-tight">AI 换装</h1>
        <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5 tracking-tight">上传模特图 + 参考服装，一键替换指定部位</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Canvas editor */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3 w-full lg:w-72 shrink-0">
            <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">模特图片</p>

            <div
              className={`relative w-full aspect-square rounded-xl overflow-hidden bg-[#f5f5f7] border-2 border-dashed transition-all ${modelUrl ? 'border-black/10' : 'border-black/15 cursor-pointer hover:border-[#0071e3]'}`}
              onClick={() => !modelUrl && modelFileRef.current?.click()}
            >
              {!modelUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[rgba(0,0,0,0.36)]">
                  <Upload size={26} className="opacity-50" />
                  <p className="text-xs tracking-tight">点击上传模特图</p>
                </div>
              ) : (
                <>
                  <canvas ref={imgCanvasRef} className="absolute inset-0 w-full h-full" />
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ cursor: tool === 'brush' ? 'crosshair' : 'cell', touchAction: 'none' }}
                    onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                    onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
                  />
                </>
              )}
            </div>

            {modelUrl && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {[{ v: 'brush' as const, icon: <Brush size={11} />, label: '画笔' }, { v: 'eraser' as const, icon: <Eraser size={11} />, label: '橡皮' }].map(t => (
                  <button key={t.v} onClick={() => setTool(t.v)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${tool === t.v ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] text-[rgba(0,0,0,0.56)] hover:text-[#1d1d1f]'}`}>
                    {t.icon}{t.label}
                  </button>
                ))}
                <input type="range" min={10} max={80} value={brushSize}
                  onChange={e => setBrushSize(+e.target.value)}
                  className="w-16 h-1.5 accent-[#0071e3]" />
                <button onClick={clearMask}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#f5f5f7] text-[rgba(0,0,0,0.56)] hover:text-red-500 transition-colors">
                  <RotateCcw size={11} /> 清除
                </button>
              </div>
            )}
            <p className="text-[10px] text-[rgba(0,0,0,0.36)] tracking-tight leading-relaxed">
              {modelUrl ? '蓝色 = 替换区域；不涂则按分类自动识别' : ''}
            </p>
            <button onClick={() => modelFileRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-black/15 text-xs font-medium text-[rgba(0,0,0,0.56)] hover:border-[#0071e3] hover:text-[#0071e3] transition-all">
              <Upload size={12} /> {modelUrl ? '重新上传' : '选择图片'}
            </button>
            <input ref={modelFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setModelUrl(URL.createObjectURL(f)); setResults([]) } }} />
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3 w-full">

            {/* Category */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
              <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">替换部位</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => setCategory(cat.value)}
                    style={{ border: `2px solid ${category === cat.value ? '#0071e3' : 'transparent'}` }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${category === cat.value ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] text-[rgba(0,0,0,0.7)] hover:bg-[#e8e8ed]'}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference clothing */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
              <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">参考服装</p>
              <div className="flex gap-3 items-start">
                <div onClick={() => refFileRef.current?.click()}
                  className={`w-20 h-20 shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-all ${refImg ? 'border-black/10' : 'border-black/15 hover:border-[#0071e3]'}`}>
                  {refImg
                    ? <img src={refImg.url} className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-1 text-[rgba(0,0,0,0.36)]"><Upload size={16} /><span className="text-[10px]">上传</span></div>
                  }
                </div>
                <input ref={refFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setRefImg({ file: f, url: URL.createObjectURL(f) }); setDesc('') } }} />
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-[rgba(0,0,0,0.56)] tracking-tight leading-relaxed">上传参考服装图，AI 自动提取款式特征</p>
                  <button onClick={analyzeRef} disabled={!refImg || isAnalyzing || !apiKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f5f7] text-xs font-medium text-[rgba(0,0,0,0.7)] hover:bg-[#e8e8ed] disabled:opacity-40 transition-all">
                    {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {isAnalyzing ? '分析中…' : '自动分析款式'}
                  </button>
                </div>
              </div>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="款式描述（自动分析后可手动修改，或直接用英文描述目标服装…）"
                rows={3}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none transition-all tracking-tight font-mono" />
            </div>

            {!apiKey && <p className="text-xs text-red-500 font-medium tracking-tight">⚠ 未配置 API Key，请前往设置</p>}
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

            <button onClick={generate} disabled={!modelUrl || !desc.trim() || isGenerating || !apiKey}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0071e3] text-white text-sm font-semibold hover:opacity-85 disabled:opacity-30 transition-all tracking-tight">
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {isGenerating ? 'AI 换装中…' : '一键换装'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] space-y-3">
            <p className="text-xs font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wider">换装结果</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((url, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square bg-[#f5f5f7] group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <a href={url} download={`outfit-${Date.now()}.png`} target="_blank" rel="noreferrer"
                    className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/90 text-xs font-medium text-[#1d1d1f] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    <Download size={11} /> 下载
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
