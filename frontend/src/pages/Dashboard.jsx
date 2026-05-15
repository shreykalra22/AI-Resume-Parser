// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from '../api/axiosConfig'
import toast from 'react-hot-toast'
import {
  FileText, Upload, Users, TrendingUp,
  Search, Trash2, Eye, Loader2, Star
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'green' }) {
  const colors = {
    green:  'bg-green-50  text-green-600  dark:bg-green-900/20  dark:text-green-400',
    blue:   'bg-blue-50   text-blue-600   dark:bg-blue-900/20   dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    amber:  'bg-amber-50  text-amber-600  dark:bg-amber-900/20  dark:text-amber-400',
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── ATS score badge ───────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  if (score == null) return <span className="text-xs text-gray-400">No JD</span>
  const color =
    score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    score >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Star size={10} /> {score}%
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [resumes,    setResumes]    = useState([])
  const [analytics,  setAnalytics]  = useState(null)
  const [search,     setSearch]     = useState('')
  const [skillFilter,setSkillFilter]= useState('')
  const [loading,    setLoading]    = useState(true)
  const [deleting,   setDeleting]   = useState(null)

  // Fetch resumes
  const fetchResumes = async () => {
    try {
      const params = {}
      if (search)      params.search = search
      if (skillFilter) params.skill  = skillFilter
      const { data } = await axios.get('/resumes', { params })
      setResumes(data.resumes || [])
    } catch {
      toast.error('Failed to load resumes')
    }
  }

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get('/resumes/analytics/summary')
      setAnalytics(data)
    } catch {
      // analytics are non-critical
    }
  }

  useEffect(() => {
  setLoading(false)
}, [])

//   useEffect(() => {
//     fetchResumes()
//   }, [search, skillFilter])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete resume for "${name}"?`)) return
    setDeleting(id)
    try {
      await axios.delete(`/resumes/${id}`)
      setResumes(r => r.filter(x => x._id !== id))
      toast.success('Resume deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and analyse your parsed resumes</p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700
            text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Upload size={15} /> Upload Resume
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}   label="Total Resumes"  value={analytics?.totalResumes ?? resumes.length} color="green" />
        <StatCard icon={Users}      label="Candidates"     value={analytics?.totalResumes ?? resumes.length} color="blue" />
        <StatCard icon={TrendingUp} label="Avg ATS Score"  value={analytics?.avgAtsScore ? `${analytics.avgAtsScore}%` : '—'} color="purple" />
        <StatCard icon={Star}       label="Top Skills"     value={analytics?.skillFrequency?.[0]?.skill ?? '—'} color="amber" />
      </div>

      {/* Skills chart */}
      {analytics?.skillFrequency?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Top skills across candidates
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.skillFrequency.slice(0, 10)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                cursor={{ fill: '#f0fdf4' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {analytics.skillFrequency.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#16a34a' : '#bbf7d0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700
              rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-400"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by skill (e.g. python)…"
          value={skillFilter}
          onChange={e => setSkillFilter(e.target.value)}
          className="sm:w-56 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700
            rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-400"
        />
      </div>

      {/* Resume cards */}
      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No resumes found</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first resume to get started</p>
          <Link to="/upload"
            className="mt-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
            Upload now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map(r => (
            <div key={r._id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-green-300 dark:hover:border-green-700 transition-colors">

              {/* Avatar + name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-400 font-semibold text-sm flex-shrink-0">
                  {r.parsedData?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {r.parsedData?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.parsedData?.email || 'No email'}
                  </p>
                </div>
                <ScoreBadge score={r.atsScore?.score} />
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(r.parsedData?.skills || []).slice(0, 4).map(s => (
                  <span key={s}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md">
                    {s}
                  </span>
                ))}
                {(r.parsedData?.skills?.length || 0) > 4 && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs rounded-md">
                    +{r.parsedData.skills.length - 4}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400">
                  {r.parsedData?.experience_years
                    ? `${r.parsedData.experience_years} yrs exp`
                    : r.fileName}
                </span>
                <div className="flex items-center gap-1">
                  <Link to={`/resume/${r._id}`}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                    <Eye size={15} />
                  </Link>
                  <button
                    onClick={() => handleDelete(r._id, r.parsedData?.name)}
                    disabled={deleting === r._id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    {deleting === r._id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}