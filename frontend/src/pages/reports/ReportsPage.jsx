import { useState, useEffect } from 'react'
import { reportsAPI, departmentsAPI } from '../../services/api'
import { FileText, Download, Loader2, FileSpreadsheet, FileType } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: FileType, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
  { id: 'csv', label: 'CSV', icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
]

export default function ReportsPage() {
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState('pdf')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { departmentsAPI.getAll().then(({ data }) => setDepartments(data.data || [])) }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await reportsAPI.generate({
        format, departmentId: departmentId || undefined,
        startDate: startDate || undefined, endDate: endDate || undefined,
      })

      const blob = new Blob([data], {
        type: format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance_report_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Report downloaded successfully!')
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Generate Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Export attendance data in your preferred format</p>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Department (optional)</label>
          <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="input">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Export Format</label>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  format === f.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                )}
              >
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', f.color)}>
                  <f.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generating} className="btn-primary w-full py-2.5">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {generating ? 'Generating...' : `Download ${format.toUpperCase()} Report`}
        </button>
      </div>

      <div className="card p-5 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          📊 Reports include date, student name, roll number, department, status, time, confidence score, emotion, and marking method. Limited to 1000-5000 records per export depending on format.
        </p>
      </div>
    </div>
  )
}
