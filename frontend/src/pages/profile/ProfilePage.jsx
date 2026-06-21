import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usersAPI, authAPI } from '../../services/api'
import { User, Mail, Phone, Lock, Loader2, Save, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [whatsapp, setWhatsapp] = useState(user?.whatsappNumber || '')
  const [emailNotif, setEmailNotif] = useState(user?.notificationPreferences?.email ?? true)
  const [whatsappNotif, setWhatsappNotif] = useState(user?.notificationPreferences?.whatsapp ?? false)
  const [saving, setSaving] = useState(false)

  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('phone', phone)
      formData.append('whatsappNumber', whatsapp)
      formData.append('notificationPreferences', JSON.stringify({ email: emailNotif, whatsapp: whatsappNotif }))
      const { data } = await usersAPI.updateProfile(formData)
      updateUser(data.user)
      toast.success('Profile updated')
    } catch { toast.error('Failed to update profile') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (!currentPass || !newPass) { toast.error('Fill both password fields'); return }
    setChangingPass(true)
    try {
      await authAPI.changePassword({ currentPassword: currentPass, newPassword: newPass })
      toast.success('Password changed successfully')
      setCurrentPass(''); setNewPass('')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password') }
    finally { setChangingPass(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <h1 className="page-title">My Profile</h1>

      <div className="card p-6 space-y-4">
        <h2 className="section-title">Personal Information</h2>
        <div>
          <label className="label">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input value={user?.email} disabled className="input opacity-60" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="label">WhatsApp Number (for notifications)</label>
          <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="input" placeholder="+919876543210" />
        </div>
        <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="section-title flex items-center gap-2"><Bell className="w-4 h-4" /> Notification Preferences</h2>
        {[
          { label: 'Email Notifications', val: emailNotif, set: setEmailNotif },
          { label: 'WhatsApp Notifications', val: whatsappNotif, set: setWhatsappNotif },
        ].map(item => (
          <label key={item.label} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
            <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} className="w-5 h-5 rounded accent-primary-600" />
          </label>
        ))}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="section-title flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h2>
        <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Current password" className="input" />
        <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password (min 8 chars)" className="input" />
        <button onClick={handleChangePassword} disabled={changingPass} className="btn-secondary">
          {changingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Update Password
        </button>
      </div>
    </div>
  )
}
