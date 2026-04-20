import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CHAT_MODEL } from '../lib/models'

export interface AttachedFile {
  name: string
  kind: 'image' | 'text' | 'other'
  previewUrl?: string
  size: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: AttachedFile[]
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  model: string
  systemPrompt: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

interface ConversationState {
  conversations: Conversation[]
  activeId: string | null
  streamingId: string | null

  newConversation: () => string
  deleteConversation: (id: string) => void
  setActiveId: (id: string) => void
  setModel: (id: string, model: string) => void
  setSystemPrompt: (id: string, prompt: string) => void
  setTitle: (id: string, title: string) => void
  addMessage: (convId: string, msg: Omit<Message, 'id' | 'timestamp'>) => void
  appendToLast: (convId: string, text: string) => void
  setStreaming: (id: string | null) => void
  clearMessages: (convId: string) => void

  active: () => Conversation | null
}

let counter = 0
const uid = () => `conv-${Date.now()}-${++counter}`
const msgId = () => `msg-${Date.now()}-${++counter}`

const DEFAULT_SYSTEM = '你是一个有帮助的 AI 助手，请用简洁清晰的中文回答问题。'

function makeConversation(): Conversation {
  return {
    id: uid(),
    title: '新对话',
    model: DEFAULT_CHAT_MODEL,
    systemPrompt: DEFAULT_SYSTEM,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      streamingId: null,

      newConversation: () => {
        const conv = makeConversation()
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeId: conv.id,
        }))
        return conv.id
      },

      deleteConversation: (id) =>
        set((s) => {
          const rest = s.conversations.filter((c) => c.id !== id)
          const activeId =
            s.activeId === id ? (rest[0]?.id ?? null) : s.activeId
          return { conversations: rest, activeId }
        }),

      setActiveId: (id) => set({ activeId: id }),

      setModel: (id, model) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, model, updatedAt: Date.now() } : c,
          ),
        })),

      setSystemPrompt: (id, systemPrompt) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, systemPrompt, updatedAt: Date.now() } : c,
          ),
        })),

      setTitle: (id, title) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c,
          ),
        })),

      addMessage: (convId, msg) => {
        const id = msgId()
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c
            const messages = [...c.messages, { ...msg, id, timestamp: Date.now() }]
            // auto-title from first user message
            const title =
              c.messages.length === 0 && msg.role === 'user'
                ? msg.content.slice(0, 40) || '新对话'
                : c.title
            return { ...c, messages, title, updatedAt: Date.now() }
          }),
        }))
      },

      appendToLast: (convId, text) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c
            const msgs = [...c.messages]
            if (msgs.length === 0) return c
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content: msgs[msgs.length - 1].content + text,
            }
            return { ...c, messages: msgs, updatedAt: Date.now() }
          }),
        })),

      setStreaming: (streamingId) => set({ streamingId }),

      clearMessages: (convId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? { ...c, messages: [], title: '新对话', updatedAt: Date.now() }
              : c,
          ),
        })),

      active: () => {
        const s = get()
        return s.conversations.find((c) => c.id === s.activeId) ?? null
      },
    }),
    {
      name: 'ai-helper-conversations',
      partialize: (s) => ({ conversations: s.conversations, activeId: s.activeId }),
    },
  ),
)
