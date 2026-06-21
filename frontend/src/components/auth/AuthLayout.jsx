import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Shield } from 'lucide-react'

export default function AuthLayout() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-secondary-700 items-center justify-center p-12">
        <div className="max-w-md text-white space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">AI Attendance</h1>
          </div>
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Smart Attendance<br />Management System
            </h2>
            <p className="text-primary-100 text-lg leading-relaxed">
              AI-powered face recognition attendance with anti-spoofing, emotion detection, and real-time analytics.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Face Recognition', value: 'InsightFace' },
              { label: 'Anti-Spoofing', value: 'Active' },
              { label: 'Emotion Detection', value: 'DeepFace' },
              { label: 'Real-time Analytics', value: 'Live' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white font-semibold">{f.value}</p>
                <p className="text-primary-200 text-sm mt-0.5">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">AI Attendance</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
