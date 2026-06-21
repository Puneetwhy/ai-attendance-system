import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { notificationsAPI } from '../../services/api'
import {
  LayoutDashboard, Users, CalendarCheck, ClipboardList, BarChart3,
  FileText, MessageCircle, Settings, LogOut, Bell, Sun, Moon,
  Menu, X, GraduationCap, ChevronRight, User, BookOpen,
  Brain, Shield, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const NAV_ITEMS = {
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/students', icon: GraduationCap, label: 'Students' },
    { to: '/attendance/face', icon: CalendarCheck, label: 'Take Attendance' },
    { to: '/attendance/history', icon: ClipboardList, label: 'Attendance Log' },
    { to: '/leaves', icon: BookOpen, label: 'Leave Management' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/chatbot', icon: Brain, label: 'AI Assistant' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ],
  teacher: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/students', icon: GraduationCap, label: 'Students' },
    { to: '/attendance/face', icon: CalendarCheck, label: 'Take Attendance' },
    { to: '/attendance/history', icon: ClipboardList, label: 'Attendance Log' },
    { to: '/leaves', icon: BookOpen, label: 'Leave Requests' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/chatbot', icon: Brain, label: 'AI Assistant' },
  ],
  student: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance/history', icon: ClipboardList, label: 'My Attendance' },
    { to: '/leaves', icon: BookOpen, label: 'My Leaves' },
    { to: '/chatbot', icon: Brain, label: 'AI Assistant' },
  ],
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])

  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.student

  useEffect(() => {
    // Fetch unread notification count
    notificationsAPI.getAll({ isRead: false, limit: 5 })
      .then(({ data }) => {
        setUnreadCount(data.unreadCount || 0)
        setNotifications(data.data || [])
      })
      .catch(() => {})

    // Poll every 30 seconds
    const interval = setInterval(() => {
      notificationsAPI.getAll({ isRead: false, limit: 5 })
        .then(({ data }) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const markAllRead = async () => {
    await notificationsAPI.markAllRead()
    setUnreadCount(0)
    setNotifications([])
    setShowNotifications(false)
  }

  const roleColor = { admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', student: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">AI Attendance</p>
              <p className="text-xs text-gray-400">Smart System</p>
            </div>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <span className={clsx('badge text-xs capitalize', roleColor[user?.role])}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <NavLink to="/profile" onClick={() => setSidebarOpen(false)} className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}>
            <User className="w-4.5 h-4.5" />
            <span>Profile</span>
          </NavLink>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600">
            <LogOut className="w-4.5 h-4.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <button className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>Home</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 dark:text-white font-medium capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 card shadow-xl z-50 overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">No new notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n._id} className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
