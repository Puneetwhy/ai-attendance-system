import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { studentsAPI, attendanceAPI } from '../../services/api'
import {
  ArrowLeft, Mail, Phone, Calendar, MapPin, Trash2,
  CheckCircle2, XCircle, Loader2, Camera, Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [faceFiles, setFaceFiles] = useState([])
  const [registering, setRegistering] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [studentRes, attRes] = await Promise.all([
        studentsAPI.getOne(id),
        attendanceAPI.getStudentAttendance(id),
      ])
      setStudent(studentRes.data.student)
      setAttendance(attRes.data)
    } catch { toast.error('Failed to load student details') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [id])

  const handleRegisterFace = async () => {
    if (faceFiles.length === 0) return
    setRegistering(true)
    try {
      const formData = new FormData()
      faceFiles.forEach(f => formData.append('faceImages', f))
      const { data } = await studentsAPI.registerFace(id, formData)
      toast.success(data.message)
      setFaceFiles([])
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed') }
    finally { setRegistering(false) }
  }

  const handleDeleteFaceData = async () => {
    if (!confirm('Remove all face data for this student?')) return
    try {
      await studentsAPI.deleteFaceData(id)
      toast.success('Face data removed')
      fetchData()
    } catch { toast.error('Failed to remove face data') }
  }

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
  if (!student) return <p className="text-center text-gray-400 py-12">Student not found</p>

  const stats = attendance?.stats || {}
  const pct = parseFloat(stats.percentage) || 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-slide-up">
      <Link to="/students" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </Link>

      {/* Profile header */}
      <div className="card p-6 flex flex-wrap items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden flex-shrink-0">
          {student.user?.profileImage ? <img src={student.user.profileImage} className="w-full h-full object-cover" /> : student.user?.name?.[0]}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{student.user?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">{student.rollNumber}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {student.user?.email}</span>
            {student.user?.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {student.user.phone}</span>}
          </div>
        </div>
        <div className="text-right">
          <span className={clsx('badge text-base px-3 py-1', pct >= 75 ? 'badge-success' : 'badge-danger')}>{pct.toFixed(1)}%</span>
          <p className="text-xs text-gray-400 mt-1">Attendance</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Department', value: student.department?.name },
          { label: 'Semester', value: `Sem ${student.semester}` },
          { label: 'Section', value: student.section || '—' },
          { label: 'Batch', value: student.batch || '—' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className="font-semibold text-gray-900 dark:text-white mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Attendance stats */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Attendance Summary</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'Present', val: stats.present, c: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { label: 'Absent', val: stats.absent, c: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
            { label: 'Late', val: stats.late, c: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Leave', val: stats.leave, c: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-xl p-3', s.c)}>
              <p className="text-xl font-bold">{s.val || 0}</p>
              <p className="text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Face registration */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Face Recognition Data</h2>
          {student.isFaceRegistered ? (
            <span className="flex items-center gap-1.5 text-green-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Registered ({student.faceImages?.length || 0} images)</span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-400 text-sm"><XCircle className="w-4 h-4" /> Not registered</span>
          )}
        </div>

        {student.faceImages?.length > 0 && (
          <div className="grid grid-cols-6 gap-2 mb-4">
            {student.faceImages.slice(0, 6).map((img, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={img.url} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <label className="btn-secondary cursor-pointer">
            <Camera className="w-4 h-4" /> Add Face Images
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => setFaceFiles(Array.from(e.target.files || []))} />
          </label>
          {faceFiles.length > 0 && (
            <button onClick={handleRegisterFace} disabled={registering} className="btn-primary">
              {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload {faceFiles.length} image(s)
            </button>
          )}
          {student.isFaceRegistered && (
            <button onClick={handleDeleteFaceData} className="btn-danger"><Trash2 className="w-4 h-4" /> Remove Face Data</button>
          )}
        </div>
      </div>

      {/* Recent attendance */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Recent Attendance Records</h2>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Date</th><th>Time</th><th>Session</th><th>Status</th><th>Method</th></tr></thead>
            <tbody>
              {(attendance?.records || []).slice(0, 10).map(r => (
                <tr key={r._id}>
                  <td className="text-sm">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="text-sm">{r.time}</td>
                  <td className="text-sm capitalize">{r.session}</td>
                  <td><span className={clsx('badge', r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : 'badge-danger')}>{r.status}</span></td>
                  <td className="text-xs text-gray-400 capitalize">{r.method?.replace('_', ' ')}</td>
                </tr>
              ))}
              {!attendance?.records?.length && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No records yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
