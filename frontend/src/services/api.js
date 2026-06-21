import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Request interceptor: attach token ────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: auto token refresh ─────────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        isRefreshing = false
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  changePassword: (data) => api.put('/auth/change-password', data),
  refreshToken: (token) => api.post('/auth/refresh-token', { refreshToken: token }),
}

// ── Students ──────────────────────────────────────────────────
export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getOne: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/students/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/students/${id}`),
  registerFace: (id, formData) => api.post(`/students/${id}/register-face`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteFaceData: (id) => api.delete(`/students/${id}/face-data`),
  bulkImport: (formData) => api.post('/students/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// ── Attendance ────────────────────────────────────────────────
export const attendanceAPI = {
  markByFace: (data) => api.post('/attendance/recognize', data),
  markManual: (data) => api.post('/attendance/manual', data),
  bulkMark: (data) => api.post('/attendance/bulk', data),
  getAll: (params) => api.get('/attendance', { params }),
  getDailySummary: (params) => api.get('/attendance/summary/daily', { params }),
  getStudentAttendance: (studentId, params) => api.get(`/attendance/student/${studentId}`, { params }),
}

// ── Leaves ────────────────────────────────────────────────────
export const leavesAPI = {
  apply: (formData) => api.post('/leaves', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/leaves', { params }),
  review: (id, data) => api.put(`/leaves/${id}/review`, data),
  cancel: (id) => api.put(`/leaves/${id}/cancel`),
}

// ── Analytics ─────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getPredictions: () => api.get('/analytics/predictions'),
  getDepartment: (id, params) => api.get(`/analytics/department/${id}`, { params }),
}

// ── Reports ───────────────────────────────────────────────────
export const reportsAPI = {
  generate: (params) => api.get('/reports/generate', { params, responseType: params.format === 'pdf' || params.format === 'excel' ? 'blob' : 'text' }),
}

// ── Notifications ─────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
}

// ── Chatbot ───────────────────────────────────────────────────
export const chatbotAPI = {
  sendMessage: (data) => api.post('/chatbot/message', data),
}

// ── Departments ───────────────────────────────────────────────
export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
}

// ── Teachers ──────────────────────────────────────────────────
export const teachersAPI = {
  getAll: () => api.get('/teachers'),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
}

// ── Users ─────────────────────────────────────────────────────
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/users', { params }),
  toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
}

export default api
