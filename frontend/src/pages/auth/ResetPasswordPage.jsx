import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authAPI } from '../../services/api'
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const onSubmit = async ({ password }) => {
    setLoading(true)
    try {
      await authAPI.resetPassword(token, password)
      toast.success('Password reset successfully!')
      navigate('/login')
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Set new password</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Choose a strong password for your account</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })} type={showPass ? 'text' : 'password'} placeholder="••••••••" className={`input pr-10 ${errors.password ? 'border-red-400' : ''}`} />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input {...register('confirm', { validate: v => v === watch('password') || 'Passwords do not match' })} type="password" placeholder="••••••••" className={`input ${errors.confirm ? 'border-red-400' : ''}`} />
          {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
