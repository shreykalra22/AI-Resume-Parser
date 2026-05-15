import { createContext, useContext, useState, useEffect } from 'react'
import axios from '../api/axiosConfig'

const AuthContext = createContext(null)

/**
 * AuthProvider — wraps the entire app.
 * On mount, checks localStorage for an existing token and
 * fetches the current user profile to restore the session.
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Called after successful login or register
  const login = (userData, token) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  // Clears session and redirects to login (navigation in component)
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — use this in any component: const { user, login, logout } = useAuth()
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}