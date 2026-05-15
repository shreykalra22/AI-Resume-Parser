// frontend/src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from '../api/axiosConfig'
import toast from 'react-hot-toast'
import { Brain, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email || !form.password)
      return toast.error('Please fill in all fields')

    setLoading(true)
    try {
      const fakeUser = {
  name: 'Shrey',
  email: form.email
}

login(fakeUser, 'demo-token')

toast.success(`Welcome back, ${fakeUser.name}!`)
navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center mb-3">
            <Brain size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your ResumeAI account</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                  placeholder:text-gray-400 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-700
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                    placeholder:text-gray-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-60
                text-white text-sm font-medium rounded-lg transition-colors
                flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-600 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}