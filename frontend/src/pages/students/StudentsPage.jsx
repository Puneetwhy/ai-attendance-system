import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { studentsAPI, departmentsAPI } from '../../services/api'
import {
  Search, Plus, Upload, ChevronLeft, ChevronRight,
  Eye, Trash2, CheckCircle2, XCircle, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [faceFilter, setFaceFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await studentsAPI.getAll({
        search: search || undefined,
        departmentId: deptFilter || undefined,
        isFaceRegistered: faceFilter || undefined,
        page, limit: 15,
      })
      setStudents(data.data)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch { toast.error('Failed to load students') }
    finally { setLoading(false) }
  }, [search, deptFilter, faceFilter, page])

  useEffect(() => { fetchStudents() }, [fetchStudents])
  useEffect(() => { departmentsAPI.getAll().then(({ data }) => setDepartments(data.data || [])) }, [])

  const handleDelete = async (id, name) => {
    if (!confirm(`Deactivate ${name}? This can be reversed by an admin.`)) return
    try {
      await studentsAPI.delete(id)
      toast.success('Student deactivated')
      fetchStudents()
    } catch { toast.error('Failed to deactivate student') }
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const formData = new FormData()
    formData.append('csvFile', file)
    try {
      const { data } = await studentsAPI.bulkImport(formData)
      toast.success(data.message)
      setShowImport(false)
      fetchStudents()
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed') }
    finally { setImporting(false) }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total students</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload className="w-4 h-4" /> Import CSV</button>
          <Link to="/students/add" className="btn-primary"><Plus className="w-4 h-4" /> Add Student</Link>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, roll no, email..." className="input pl-10" />
        </div>
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1) }} className="input w-auto">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select value={faceFilter} onChange={e => { setFaceFilter(e.target.value); setPage(1) }} className="input w-auto">
          <option value="">All Students</option>
          <option value="true">Face Registered</option>
          <option value="false">Face Not Registered</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th><th>Roll No</th><th>Department</th><th>Semester</th>
              <th>Attendance</th><th>Face Status</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton h-10 w-full" /></td></tr>)
            ) : students.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No students found</td></tr>
            ) : students.map(s => (
              <tr key={s._id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden flex-shrink-0">
                      {s.user?.profileImage ? <img src={s.user.profileImage} className="w-full h-full object-cover" /> : s.user?.name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{s.user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="font-mono text-xs">{s.rollNumber}</td>
                <td>{s.department?.name}</td>
                <td>Sem {s.semester}</td>
                <td>
                  <span className={clsx('badge', parseFloat(s.attendanceStats?.percentage) >= 75 ? 'badge-success' : 'badge-danger')}>
                    {parseFloat(s.attendanceStats?.percentage || 0).toFixed(1)}%
                  </span>
                </td>
                <td>
                  {s.isFaceRegistered
                    ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Registered</span>
                    : <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle className="w-3.5 h-3.5" /> Pending</span>}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/students/${s._id}`} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="View"><Eye className="w-4 h-4" /></Link>
                    <button onClick={() => handleDelete(s._id, s.user?.name)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
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

      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="section-title mb-2">Bulk Import Students</h3>
            <p className="text-sm text-gray-500 mb-4">Upload a CSV with columns: name, email, roll_number, department_code, semester, section, phone</p>
            <label className="block">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400">
                {importing ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-500" /> : <Upload className="w-8 h-8 mx-auto text-gray-300" />}
                <p className="text-sm text-gray-500 mt-2">{importing ? 'Importing...' : 'Click to select CSV file'}</p>
              </div>
              <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={importing} />
            </label>
            <button onClick={() => setShowImport(false)} className="btn-secondary w-full mt-4">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
