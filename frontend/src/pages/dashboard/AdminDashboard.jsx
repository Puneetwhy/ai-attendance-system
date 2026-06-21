import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { analyticsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown,
  AlertTriangle, Brain, ArrowRight, RefreshCw, CalendarCheck,
} from 'lucide-react'
import clsx from 'clsx'

const EMOTION_COLORS = {
  happy: '#22c55e', neutral: '#6b7280', sad: '#3b82f6',
  angry: '#ef4444', fear: '#8b5cf6', surprise: '#f59e0b', disgust: '#84cc16',
}
const CHART_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6']

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={clsx('flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const { data: res } = await analyticsAPI.getDashboard()
      setData(res)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="stat-card"><div className="skeleton h-24 w-full" /></div>)}
        </div>
      </div>
    )
  }

  const { stats = {}, attendanceTrend = [], emotionStats = [], departmentStats = [], atRisk = [] } = data || {}

  const trendData = attendanceTrend.map(d => ({
    date: d._id?.slice(5), // "MM-DD"
    Present: d.present,
    Absent: d.absent,
    Late: d.late,
    Rate: d.total ? ((d.present / d.total) * 100).toFixed(1) : 0,
  }))

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </p>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents?.toLocaleString()} color="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
        <StatCard icon={UserCheck} label="Present Today" value={stats.presentToday?.toLocaleString()} sub={`${stats.attendanceRate}% rate`} color="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" trend={2.1} />
        <StatCard icon={UserX} label="Absent Today" value={stats.absentToday?.toLocaleString()} color="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
        <StatCard icon={Clock} label="Late Today" value={stats.lateToday?.toLocaleString()} color="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Attendance trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Attendance Trend (30 Days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="present" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="absent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="Present" stroke="#22c55e" fill="url(#present)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Absent" stroke="#ef4444" fill="url(#absent)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Late" stroke="#f59e0b" fill="none" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Emotion distribution */}
        <div className="card p-5">
          <h2 className="section-title mb-5">Today's Emotions</h2>
          {emotionStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Brain className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No emotion data yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={emotionStats.map(e => ({ name: e._id, value: e.count }))} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {emotionStats.map((entry, i) => (
                      <Cell key={entry._id} fill={EMOTION_COLORS[entry._id] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {emotionStats.slice(0, 6).map((e) => (
                  <div key={e._id} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: EMOTION_COLORS[e._id] || '#6b7280' }} />
                    <span className="text-gray-600 dark:text-gray-400 capitalize truncate">{e._id}</span>
                    <span className="ml-auto font-medium text-gray-900 dark:text-white">{e.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Department stats + At-risk students */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Dept attendance */}
        <div className="card p-5">
          <h2 className="section-title mb-5">Department Attendance</h2>
          {departmentStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No department data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={departmentStats.map(d => ({ name: d._id?.name, Present: d.present, Total: d.total, Rate: d.percentage?.toFixed(1) }))} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* At-risk students */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="section-title">At-Risk Students</h2>
            </div>
            <Link to="/analytics" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {atRisk.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <UserCheck className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">All students above 75%</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {atRisk.slice(0, 5).map((s) => (
                <div key={s._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400 flex-shrink-0">
                    {s.user?.name?.[0] || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.user?.name || s.rollNumber}</p>
                    <p className="text-xs text-gray-400">{s.department?.name} · {s.rollNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className={clsx('badge', parseFloat(s.attendanceStats?.percentage) < 60 ? 'badge-danger' : 'badge-warning')}>
                      {parseFloat(s.attendanceStats?.percentage).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/attendance/face', icon: CalendarCheck, label: 'Take Attendance', color: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-primary-100 dark:border-primary-800' },
            { to: '/students/add', icon: Users, label: 'Add Student', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' },
            { to: '/leaves', icon: Clock, label: 'Review Leaves', color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800' },
            { to: '/reports', icon: TrendingUp, label: 'Generate Report', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800' },
          ].map((a) => (
            <Link key={a.to} to={a.to} className={clsx('flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center hover:scale-[1.02] transition-transform', a.color)}>
              <a.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
