import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Image, Wand2, Settings, Trash2, Bot, Sun, Moon, X, Shirt } from 'lucide-react'
import { useConversationStore } from '../store/conversationStore'
import { useSettingsStore } from '../store/settingsStore'

const tools = [
  { to: '/vision',   icon: Image,    label: '图片识别' },
  { to: '/imagegen', icon: Wand2,    label: '图片生成' },
  { to: '/clothing', icon: Shirt,    label: 'AI 换装' },
  { to: '/settings', icon: Settings, label: '设置' },
]

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  const { conversations, activeId, newConversation, deleteConversation, setActiveId } =
    useConversationStore()
  const { theme, setTheme } = useSettingsStore()
  const navigate = useNavigate()
  const [hoverId, setHoverId] = useState<string | null>(null)

  const go = (path: string) => {
    navigate(path)
    onClose?.()
  }

  const handleNew = () => {
    const id = newConversation()
    setActiveId(id)
    go('/chat')
  }

  const handleSelect = (id: string) => {
    setActiveId(id)
    go('/chat')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteConversation(id)
    if (activeId === id) go('/chat')
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-[#1d1d1f] h-screen">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#0071e3] flex items-center justify-center shrink-0">
          <Bot size={16} className="text-white" />
        </div>
        <span className="flex-1 font-semibold text-white tracking-tight text-sm">AI Helper</span>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={handleNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0071e3] text-white text-sm font-medium hover:opacity-80 transition-all"
        >
          <Plus size={15} />
          新对话
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-white/30 text-xs text-center py-6 px-3 tracking-tight">
            点击"新对话"开始聊天
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            onMouseEnter={() => setHoverId(conv.id)}
            onMouseLeave={() => setHoverId(null)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
              activeId === conv.id ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <MessageSquare size={13} className="shrink-0 text-white/50" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight tracking-tight">
                {conv.title}
              </p>
              <p className="text-xs text-white/40 truncate mt-0.5">{conv.model}</p>
            </div>
            {hoverId === conv.id && (
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="shrink-0 p-1 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tools */}
      <div className="px-2 py-2 border-t border-white/10 space-y-0.5">
        {tools.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'text-[#0071e3] bg-white/5'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {theme === 'light' ? '深色模式' : '浅色模式'}
        </button>
      </div>
    </aside>
  )
}
