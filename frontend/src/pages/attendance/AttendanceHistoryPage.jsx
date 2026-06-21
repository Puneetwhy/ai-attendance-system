import { useState, useEffect, useCallback } from 'react'
import { attendanceAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Filter, ChevronLeft, ChevronRight, Smile, Shield } from 'lucide-react'
import clsx from 'clsx'

const EMOTION_EMOJI = { happy: '😊', sad: '😢', angry: '😠', neutral: '😐', fear: '😨', surprise: '😲', disgust: '🤢' }

export default function AttendanceHistoryPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await attendanceAPI.getAll({
        page, limit: 20,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setRecords(data.data)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {}
    finally { setLoading(false) }
  }, [page, status, startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="page-title">Attendance History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} records</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input w-auto">
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="leave">Leave</option>
        </select>
        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} className="input w-auto" placeholder="Start date" />
        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} className="input w-auto" placeholder="End date" />
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {user?.role !== 'student' && <th>Student</th>}
              <th>Date</th><th>Time</th><th>Session</th><th>Status</th>
              <th>Confidence</th><th>Emotion</th><th>Method</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton h-9 w-full" /></td></tr>) :
              records.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">No records found</td></tr> :
              records.map(r => (
                <tr key={r._id}>
                  {user?.role !== 'student' && (
                    <td>
                      <p className="font-medium text-sm">{r.student?.user?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.student?.rollNumber}</p>
                    </td>
                  )}
                  <td className="text-sm">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="text-sm">{r.time}</td>
                  <td className="text-sm capitalize">{r.session}</td>
                  <td>
                    <span className={clsx('badge', r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : r.status === 'leave' ? 'badge-info' : 'badge-danger')}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-xs">{r.faceData?.confidenceScore ? `${(r.faceData.confidenceScore * 100).toFixed(0)}%` : '—'}</td>
                  <td className="text-sm">{r.emotion?.detected ? `${EMOTION_EMOJI[r.emotion.detected] || ''} ${r.emotion.detected}` : '—'}</td>
                  <td className="text-xs text-gray-400 capitalize">{r.method?.replace('_', ' ')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
