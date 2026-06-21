import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

// Layouts
import DashboardLayout from './components/common/DashboardLayout'
import AuthLayout from './components/auth/AuthLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Dashboard Pages
import AdminDashboard from './pages/dashboard/AdminDashboard'
import TeacherDashboard from './pages/dashboard/TeacherDashboard'
import StudentDashboard from './pages/dashboard/StudentDashboard'

// Student Management
import StudentsPage from './pages/students/StudentsPage'
import StudentDetailPage from './pages/students/StudentDetailPage'
import AddStudentPage from './pages/students/AddStudentPage'

// Attendance
import AttendancePage from './pages/attendance/AttendancePage'
import FaceAttendancePage from './pages/attendance/FaceAttendancePage'
import AttendanceHistoryPage from './pages/attendance/AttendanceHistoryPage'

// Leave
import LeavePage from './pages/leave/LeavePage'

// Analytics
import AnalyticsPage from './pages/analytics/AnalyticsPage'

// Reports
import ReportsPage from './pages/reports/ReportsPage'

// Chatbot
import ChatbotPage from './pages/chatbot/ChatbotPage'

// Settings & Profile
import ProfilePage from './pages/profile/ProfilePage'
import SettingsPage from './pages/settings/SettingsPage'

// ── Route Guards ─────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function RoleDashboard() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'teacher') return <TeacherDashboard />
  return <StudentDashboard />
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: '!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-gray-100 !shadow-lg',
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            </Route>

            {/* Protected Dashboard Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<RoleDashboard />} />

              {/* Students — Admin/Teacher only */}
              <Route
                path="/students"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <StudentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students/add"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AddStudentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <StudentDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Attendance */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/attendance/face" element={<FaceAttendancePage />} />
              <Route path="/attendance/history" element={<AttendanceHistoryPage />} />

              {/* Leave */}
              <Route path="/leaves" element={<LeavePage />} />

              {/* Analytics — Admin/Teacher */}
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />

              {/* Reports — Admin/Teacher */}
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Chatbot */}
              <Route path="/chatbot" element={<ChatbotPage />} />

              {/* Profile & Settings */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
