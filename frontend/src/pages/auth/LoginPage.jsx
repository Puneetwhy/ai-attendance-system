import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
            })}
            type="email"
            placeholder="admin@school.edu"
            className={`input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register('password', { required: 'Password is required' })}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              className={`input pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Demo credentials */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">Demo Credentials</p>
        <div className="space-y-1.5">
          {[
            { role: 'Admin', email: 'admin@school.edu', pass: 'Admin@123456' },
            { role: 'Teacher', email: 'rajesh.kumar@school.edu', pass: 'Teacher@123' },
            { role: 'Student', email: 'arjun.patel@student.edu', pass: 'CS2021001@2024' },
          ].map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => { document.querySelector('input[type="email"]').value = c.email; document.querySelector('input[name="email"]')._wrapperState && (document.querySelector('input[name="email"]')._wrapperState.initialValue = c.email); }}
              className="w-full text-left text-xs text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <span className="font-medium">{c.role}:</span> {c.email}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
