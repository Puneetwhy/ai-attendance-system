import { useState, useEffect } from 'react'
import { analyticsAPI } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Brain, AlertTriangle, TrendingDown, Activity } from 'lucide-react'
import clsx from 'clsx'

export default function AnalyticsPage() {
  const [predictions, setPredictions] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsAPI.getPredictions(), analyticsAPI.getDashboard()])
      .then(([predRes, dashRes]) => {
        setPredictions(predRes.data.predictions || [])
        setDashboard(dashRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const riskColors = { critical: 'badge-danger', high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' }

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>

  const trendData = (dashboard?.attendanceTrend || []).map(d => ({
    date: d._id?.slice(5),
    rate: d.total ? ((d.present / d.total) * 100).toFixed(1) : 0,
  }))

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">AI Analytics & Predictions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Machine learning insights on attendance patterns and risk</p>
      </div>

      {/* Trend */}
      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><Activity className="w-4 h-4" /> Attendance Rate Trend</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI Predictions */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Brain className="w-5 h-5 text-purple-500" />
          <h2 className="section-title">AI Risk Predictions</h2>
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No at-risk students detected. Great attendance overall! 🎉</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Student</th><th>Department</th><th>Current %</th><th>Risk Level</th><th>Recommendation</th></tr></thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium">{p.student.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.student.rollNumber}</p>
                    </td>
                    <td className="text-sm">{p.student.department}</td>
                    <td className="font-semibold">{p.currentPercentage}%</td>
                    <td><span className={clsx('badge capitalize', riskColors[p.riskLevel])}>{p.riskLevel}</span></td>
                    <td className="text-xs text-gray-500 max-w-xs">{p.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Risk distribution */}
      {predictions.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Risk Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={['critical', 'high', 'medium', 'low'].map(level => ({
                level,
                count: predictions.filter(p => p.riskLevel === level).length,
              }))}
              margin={{ left: -20, right: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="level" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {['critical', 'high', 'medium', 'low'].map((level, i) => (
                  <Bar key={level} fill={level === 'critical' || level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
