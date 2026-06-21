import { useState, useEffect, useCallback } from 'react'
import { leavesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Plus, Check, X, Upload, Loader2, FileText, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function ApplyLeaveModal({ onClose, onSuccess }) {
  const [type, setType] = useState('medical')
  const [reason, setReason] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason || !fromDate || !toDate) { toast.error('Please fill all required fields'); return }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('type', type)
      formData.append('reason', reason)
      formData.append('fromDate', fromDate)
      formData.append('toDate', toDate)
      files.forEach(f => formData.append('documents', f))
      await leavesAPI.apply(formData)
      toast.success('Leave application submitted')
      onSuccess()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to apply leave') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="section-title mb-4">Apply for Leave</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input">
              <option value="medical">Medical</option>
              <option value="personal">Personal</option>
              <option value="family">Family</option>
              <option value="official">Official</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" required />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} className="input" rows={3} placeholder="Explain your reason for leave..." required />
          </div>
          <div>
            <label className="label">Supporting Documents (optional)</label>
            <input type="file" multiple accept="image/*,.pdf" onChange={e => setFiles(Array.from(e.target.files || []))} className="input" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Submit
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showApply, setShowApply] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const canReview = user?.role === 'admin' || user?.role === 'teacher'

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await leavesAPI.getAll({ status: statusFilter || undefined })
      setLeaves(data.data)
    } catch {}
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchLeaves() }, [fetchLeaves])

  const handleReview = async (id, status) => {
    const comments = status === 'rejected' ? prompt('Reason for rejection (optional):') : undefined
    try {
      await leavesAPI.review(id, { status, comments })
      toast.success(`Leave ${status}`)
      fetchLeaves()
    } catch { toast.error('Failed to update leave') }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{canReview ? 'Leave Requests' : 'My Leaves'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{leaves.length} {statusFilter || 'total'} leaves</p>
        </div>
        {!canReview && (
          <button onClick={() => setShowApply(true)} className="btn-primary"><Plus className="w-4 h-4" /> Apply Leave</button>
        )}
      </div>

      <div className="card p-4 flex gap-2">
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors', statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />) :
          leaves.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No leave records found</p>
            </div>
          ) : leaves.map(leave => (
            <div key={leave._id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {canReview && (
                    <p className="font-semibold text-gray-900 dark:text-white">{leave.student?.user?.name} <span className="text-gray-400 font-normal text-sm">({leave.student?.user?.email})</span></p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-info capitalize">{leave.type}</span>
                    <span className={clsx('badge capitalize', leave.status === 'approved' ? 'badge-success' : leave.status === 'rejected' ? 'badge-danger' : leave.status === 'cancelled' ? 'badge-neutral' : 'badge-warning')}>{leave.status}</span>
                    {leave.isUrgent && <span className="badge badge-danger">Urgent</span>}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{leave.reason}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(leave.fromDate).toLocaleDateString()} – {new Date(leave.toDate).toLocaleDateString()} ({leave.numberOfDays} days)
                  </p>
                  {leave.documents?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {leave.documents.map((doc, i) => (
                        <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {doc.name || `Doc ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                  {leave.reviewComments && (
                    <p className="text-xs text-gray-500 mt-2 italic">Comment: {leave.reviewComments}</p>
                  )}
                </div>
                {canReview && leave.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleReview(leave._id, 'approved')} className="btn-primary !bg-green-600 hover:!bg-green-700"><Check className="w-4 h-4" /></button>
                    <button onClick={() => handleReview(leave._id, 'rejected')} className="btn-danger"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {showApply && <ApplyLeaveModal onClose={() => setShowApply(false)} onSuccess={() => { setShowApply(false); fetchLeaves() }} />}
    </div>
  )
}
