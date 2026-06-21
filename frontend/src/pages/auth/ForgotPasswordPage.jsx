import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authAPI } from '../../services/api'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email }) => {
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch { toast.error('Failed to send reset email') }
    finally { setLoading(false) }
  }

  if (sent) return (
    <div className="text-center space-y-4 animate-slide-up">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Check your email</h2>
      <p className="text-gray-500 dark:text-gray-400">We've sent a password reset link. It expires in 30 minutes.</p>
      <Link to="/login" className="btn-primary inline-flex mx-auto"><ArrowLeft className="w-4 h-4" /> Back to login</Link>
    </div>
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Forgot password?</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Enter your email and we'll send a reset link</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} type="email" placeholder="you@school.edu" className={`input pl-10 ${errors.email ? 'border-red-400' : ''}`} />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>
    </div>
  )
}
