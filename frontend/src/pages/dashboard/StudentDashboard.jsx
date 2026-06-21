import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { attendanceAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { CalendarCheck, Clock, BookOpen, Brain, AlertTriangle, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const [attendanceData, setAttendanceData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?._id) { setLoading(false); return }
    attendanceAPI.getStudentAttendance(profile._id)
      .then(({ data }) => setAttendanceData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profile])

  const stats = attendanceData?.stats || { total: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 0 }
  const pct = parseFloat(stats.percentage) || 0
  const isEligible = pct >= 75
  const leaveBalance = profile?.leaveBalance || { remaining: 15, used: 0, total: 15 }

  const pieData = [
    { name: 'Present', value: stats.present, color: '#22c55e' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
    { name: 'Late', value: stats.late, color: '#f59e0b' },
    { name: 'Leave', value: stats.leave, color: '#3b82f6' },
  ].filter(d => d.value > 0)

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">My Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Welcome back, {user?.name?.split(' ')[0]}!</p>
      </div>

      {/* Eligibility banner */}
      <div className={clsx('rounded-2xl p-5 flex items-center gap-4', isEligible ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800')}>
        {isEligible ? <TrendingUp className="w-8 h-8 text-green-500 flex-shrink-0" /> : <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />}
        <div>
          <p className={clsx('font-semibold', isEligible ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
            {isEligible ? '✅ You are eligible for exams (≥75%)' : '⚠️ You are NOT eligible for exams (<75%)'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Current attendance: <strong>{pct.toFixed(1)}%</strong> · Minimum required: 75%
            {!isEligible && stats.total > 0 && ` · Need ${Math.ceil((75 * stats.total - stats.present * 100) / 25)} more classes`}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Attendance circle */}
        <div className="card p-6 flex flex-col items-center gap-3">
          <h2 className="section-title self-start">Attendance %</h2>
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={pct >= 75 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeDasharray={`${pct * 2.51} 251`} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
              <span className="text-xs text-gray-400">{stats.present}/{stats.total}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full text-xs text-center">
            {[{ label: 'Present', val: stats.present, c: 'text-green-600' }, { label: 'Absent', val: stats.absent, c: 'text-red-500' }, { label: 'Late', val: stats.late, c: 'text-yellow-500' }, { label: 'Leave', val: stats.leave, c: 'text-blue-500' }].map(s => (
              <div key={s.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <p className={`font-bold text-base ${s.c}`}>{s.val}</p>
                <p className="text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown pie */}
        <div className="card p-6">
          <h2 className="section-title mb-3">Breakdown</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-36 flex items-center justify-center text-gray-400 text-sm">No data yet</div>}
        </div>

        {/* Quick stats */}
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Leave Balance</h2>
          <div className="space-y-3">
            {[
              { label: 'Remaining', value: leaveBalance.remaining, color: 'bg-green-500', pct: (leaveBalance.remaining / leaveBalance.total) * 100 },
              { label: 'Used', value: leaveBalance.used, color: 'bg-orange-500', pct: (leaveBalance.used / leaveBalance.total) * 100 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{item.value} days</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full transition-all duration-700', item.color)} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <Link to="/leaves" className="btn-secondary w-full justify-center text-sm"><BookOpen className="w-4 h-4" /> Apply Leave</Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { to: '/attendance/history', icon: CalendarCheck, label: 'View Attendance', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' },
          { to: '/leaves', icon: Clock, label: 'Apply Leave', color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800' },
          { to: '/chatbot', icon: Brain, label: 'Ask AI', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800' },
        ].map(a => (
          <Link key={a.to} to={a.to} className={clsx('flex items-center gap-3 p-4 rounded-xl border hover:scale-[1.02] transition-transform', a.color)}>
            <a.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent attendance */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Attendance</h2>
          <Link to="/attendance/history" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Date</th><th>Time</th><th>Session</th><th>Status</th></tr></thead>
            <tbody>
              {(attendanceData?.records || []).slice(0, 8).map(r => (
                <tr key={r._id}>
                  <td className="text-sm">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="text-sm">{r.time}</td>
                  <td className="text-sm capitalize">{r.session}</td>
                  <td>
                    <span className={clsx('badge', r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : r.status === 'leave' ? 'badge-info' : 'badge-danger')}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!attendanceData?.records?.length && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No attendance records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
