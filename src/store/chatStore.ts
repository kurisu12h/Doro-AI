import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  imageUrl?: string
  timestamp: number
}

interface ChatState {
  messages: Message[]
  isStreaming: boolean
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => string
  appendToLast: (text: string) => void
  setStreaming: (v: boolean) => void
  clearMessages: () => void
}

let idCounter = 0
function genId() {
  return `msg-${Date.now()}-${++idCounter}`
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (msg) => {
    const id = genId()
    set((s) => ({
      messages: [...s.messages, { ...msg, id, timestamp: Date.now() }],
    }))
    return id
  },
  appendToLast: (text) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length === 0) return s
      msgs[msgs.length - 1] = {
        ...msgs[msgs.length - 1],
        content: msgs[msgs.length - 1].content + text,
      }
      return { messages: msgs }
    }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearMessages: () => set({ messages: [] }),
}))
