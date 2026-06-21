import { useState, useEffect } from 'react'
import { attendanceAPI, studentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Search, Check, X, Clock, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Link } from 'react-router-dom'

export default function AttendancePage() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [session, setSession] = useState('morning')
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    studentsAPI.getAll({ limit: 100 }).then(({ data }) => {
      setStudents(data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const setStatus = (studentId, status) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }))
  }

  const filtered = students.filter(s =>
    s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaveAll = async () => {
    const records = Object.entries(attendanceMap).map(([studentId, status]) => {
      const student = students.find(s => s._id === studentId)
      return { rollNumber: student?.rollNumber, status }
    }).filter(r => r.rollNumber)

    if (records.length === 0) { toast.error('No attendance marked yet'); return }

    setSaving(true)
    try {
      const { data } = await attendanceAPI.bulkMark({ records, date, session })
      toast.success(`Saved: ${data.results.success.length} success, ${data.results.skipped.length} skipped`)
      setAttendanceMap({})
    } catch { toast.error('Failed to save attendance') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Manual Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Mark attendance manually or use <Link to="/attendance/face" className="text-primary-600 font-medium">Face Recognition</Link></p>
        </div>
        <button onClick={handleSaveAll} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Attendance ({Object.keys(attendanceMap).length})
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="input pl-10" />
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-auto" />
        <select value={session} onChange={e => setSession(e.target.value)} className="input w-auto">
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Student</th><th>Roll No</th><th>Department</th><th className="text-right">Mark Attendance</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={4}><div className="skeleton h-10 w-full" /></td></tr>) :
              filtered.map(s => (
                <tr key={s._id}>
                  <td className="font-medium">{s.user?.name}</td>
                  <td className="font-mono text-xs">{s.rollNumber}</td>
                  <td>{s.department?.name}</td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {[
                        { status: 'present', icon: Check, color: 'green' },
                        { status: 'late', icon: Clock, color: 'yellow' },
                        { status: 'absent', icon: X, color: 'red' },
                      ].map(({ status, icon: Icon, color }) => (
                        <button
                          key={status}
                          onClick={() => setStatus(s._id, status)}
                          className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            attendanceMap[s._id] === status
                              ? `bg-${color}-500 text-white`
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200'
                          )}
                          style={attendanceMap[s._id] === status ? { backgroundColor: color === 'green' ? '#22c55e' : color === 'yellow' ? '#f59e0b' : '#ef4444', color: 'white' } : {}}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
