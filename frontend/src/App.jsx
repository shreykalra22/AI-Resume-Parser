// Root component — sets up routing, auth, and toast notifications
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import ResumeDetail from './pages/ResumeDetail'
import Layout from './components/Layout'

/**
 * PrivateRoute — redirects to /login if user is not authenticated.
 * Wraps any page that requires a logged-in session.
 */
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  // Wait for auth state to resolve before deciding
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

/**
 * PublicRoute — redirects logged-in users away from login/register.
 * Prevents authenticated users from seeing auth pages again.
 */
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/" replace />
}

/**
 * App — top-level component.
 * Order matters: AuthProvider must wrap BrowserRouter so all
 * routes can access the auth context via useAuth().
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        {/* Global toast notifications — appears in top-right corner */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          }}
        />

        <Routes>

          {/* Public routes — accessible without login */}
          <Route
            path="/login"
            element={<PublicRoute><Login /></PublicRoute>}
          />
          <Route
            path="/register"
            element={<PublicRoute><Register /></PublicRoute>}
          />

          {/* Protected routes — Layout provides sidebar + topbar */}
          <Route
            path="/"
            element={<PrivateRoute><Layout /></PrivateRoute>}
          >
            {/* index = "/" → Dashboard */}
            <Route index element={<Dashboard />} />

            {/* "/upload" → Upload resume page */}
            <Route path="upload" element={<Upload />} />

            {/* "/resume/:id" → Individual resume detail + ATS score */}
            <Route path="resume/:id" element={<ResumeDetail />} />
          </Route>

          {/* Catch-all → redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}