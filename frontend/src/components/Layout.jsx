// frontend/src/components/Layout.jsx
// Persistent shell: sidebar + topbar + <Outlet> for page content

import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Upload, FileText, LogOut,
  Menu, X, Brain, Moon, Sun, Bell
} from 'lucide-react'

const NAV = [
  { to: '/',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload,          label: 'Upload Resume' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const [open, setOpen]   = useState(false)
  const [dark, setDark]   = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const toggleDark = () => {
    setDark(d => !d)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white tracking-tight">
            ResumeAI
          </span>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-400 text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}