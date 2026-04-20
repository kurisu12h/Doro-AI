import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSettingsStore } from './store/settingsStore'
import Layout from './components/Layout'
import SetupPage from './pages/SetupPage'
import ChatPage from './pages/ChatPage'
import VisionPage from './pages/VisionPage'
import ImageGenPage from './pages/ImageGenPage'
import ClothingPage from './pages/ClothingPage'
import SettingsPage from './pages/SettingsPage'

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useSettingsStore()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return <>{children}</>
}

function RequireSetup({ children }: { children: React.ReactNode }) {
  const { onboardingDone } = useSettingsStore()
  if (!onboardingDone) return <Navigate to="/setup" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route
            element={
              <RequireSetup>
                <Layout />
              </RequireSetup>
            }
          >
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/vision" element={<VisionPage />} />
            <Route path="/imagegen" element={<ImageGenPage />} />
            <Route path="/clothing" element={<ClothingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
