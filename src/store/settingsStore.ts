import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CHAT_MODEL, DEFAULT_VISION_MODEL, DEFAULT_IMAGEGEN_MODEL } from '../lib/models'

interface SettingsState {
  apiKey: string
  chatModel: string
  visionModel: string
  imageGenModel: string
  onboardingDone: boolean
  theme: 'light' | 'dark'
  setApiKey: (key: string) => void
  setChatModel: (model: string) => void
  setVisionModel: (model: string) => void
  setImageGenModel: (model: string) => void
  setOnboardingDone: (done: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      chatModel: DEFAULT_CHAT_MODEL,
      visionModel: DEFAULT_VISION_MODEL,
      imageGenModel: DEFAULT_IMAGEGEN_MODEL,
      onboardingDone: false,
      theme: 'light',
      setApiKey: (apiKey) => set({ apiKey }),
      setChatModel: (chatModel) => set({ chatModel }),
      setVisionModel: (visionModel) => set({ visionModel }),
      setImageGenModel: (imageGenModel) => set({ imageGenModel }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ai-helper-settings' },
  ),
)
