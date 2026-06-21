import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { authAPI } = await import('../../services/api')
      await authAPI.register(data)
      await login(data.email, data.password)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create account</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Already have an account? <Link to="/login" className="text-primary-600 font-medium">Sign in</Link></p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {[
          { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Dr. John Smith', rules: { required: 'Name is required' } },
          { name: 'email', label: 'Email', type: 'email', placeholder: 'you@school.edu', rules: { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } } },
          { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', rules: { required: 'Password required', minLength: { value: 8, message: 'Min 8 chars' } } },
        ].map(field => (
          <div key={field.name}>
            <label className="label">{field.label}</label>
            <input {...register(field.name, field.rules)} type={field.type} placeholder={field.placeholder} className={`input ${errors[field.name] ? 'border-red-400' : ''}`} />
            {errors[field.name] && <p className="text-xs text-red-500 mt-1">{errors[field.name].message}</p>}
          </div>
        ))}
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
