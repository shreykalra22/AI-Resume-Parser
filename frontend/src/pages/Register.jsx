// frontend/src/pages/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from '../api/axiosConfig'
import toast from 'react-hot-toast'
import { Brain, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

const rules = [
  { label: 'At least 6 characters', test: p => p.length >= 6 },
  { label: 'Contains a number',      test: p => /\d/.test(p) },
]

export default function Register() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password)
      return toast.error('Please fill in all fields')
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters')

    setLoading(true)
    try {
      const fakeUser = {
  name: form.name,
  email: form.email
}

login(fakeUser, 'demo-token')

toast.success(`Account created! Welcome, ${fakeUser.name}!`)
navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Registration failed')
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Start parsing resumes with AI</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Jane Doe"
                autoComplete="name"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                  placeholder:text-gray-400 transition"
              />
            </div>

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

            {/* Password + strength */}
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
                  autoComplete="new-password"
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

              {/* Password rules */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  {rules.map(r => (
                    <div key={r.label} className="flex items-center gap-1.5">
                      <CheckCircle2
                        size={13}
                        className={r.test(form.password) ? 'text-green-500' : 'text-gray-300'}
                      />
                      <span className={`text-xs ${r.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                        {r.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}