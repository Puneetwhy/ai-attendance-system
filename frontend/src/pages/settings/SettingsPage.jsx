import { useState, useEffect } from 'react'
import { departmentsAPI } from '../../services/api'
import { Plus, Building2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchDepts = () => departmentsAPI.getAll().then(({ data }) => setDepartments(data.data || [])).finally(() => setLoading(false))
  useEffect(() => { fetchDepts() }, [])

  const handleCreate = async () => {
    if (!name || !code) { toast.error('Name and code required'); return }
    setCreating(true)
    try {
      await departmentsAPI.create({ name, code })
      toast.success('Department created')
      setShowAdd(false); setName(''); setCode('')
      fetchDepts()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create department') }
    finally { setCreating(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage departments and system configuration</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Department</button>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Departments</h2>
        {loading ? <div className="skeleton h-32 rounded-xl" /> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {departments.map(d => (
              <div key={d._id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{d.code}</p>
                {d.geofence?.latitude && <p className="text-xs text-gray-500 mt-2">📍 Geo-fence: {d.geofence.radius}m radius</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="section-title mb-4">New Department</h3>
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Department name" className="input" />
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Code (e.g. CS)" className="input" />
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                </button>
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
