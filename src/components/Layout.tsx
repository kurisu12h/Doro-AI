import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#f5f5f7] overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <div
        className={`
          fixed top-0 left-0 h-full z-40
          md:relative md:z-auto md:translate-x-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0 w-full">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#1d1d1f] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-white font-semibold text-sm tracking-tight">AI Helper</span>
        </div>

        <Outlet />
      </main>
    </div>
  )
}
