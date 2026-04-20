import { ModelConfig, getModelsByCapability } from '../lib/models'

interface Props {
  capability: ModelConfig['capabilities'][number]
  value: string
  onChange: (id: string) => void
  className?: string
}

const tierDot: Record<ModelConfig['tier'], string> = {
  free:    'bg-green-500',
  budget:  'bg-[#0071e3]',
  premium: 'bg-orange-400',
}

const tierLabel: Record<ModelConfig['tier'], string> = {
  free:    '免费',
  budget:  '经济',
  premium: '旗舰',
}

export default function ModelSelector({ capability, value, onChange, className = '' }: Props) {
  const models = getModelsByCapability(capability)

  return (
    /* Horizontal scroll on mobile, wrap on desktop */
    <div
      className={`flex gap-1.5 overflow-x-auto pb-0.5 ${className}`}
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {models.map((m) => {
        const isSelected = value === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            title={m.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-all duration-200 shrink-0 ${
              isSelected
                ? 'bg-[#0071e3] text-white'
                : 'bg-[#fafafc] text-[rgba(0,0,0,0.8)] hover:border-[rgba(0,0,0,0.2)]'
            }`}
            style={{
              borderRadius: '11px',
              border: isSelected ? '2px solid #0071e3' : '2px solid rgba(0,0,0,0.04)',
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tierDot[m.tier]}`} />
            <span className="tracking-tight whitespace-nowrap">{m.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[rgba(0,0,0,0.56)]'
              }`}
            >
              {tierLabel[m.tier]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
