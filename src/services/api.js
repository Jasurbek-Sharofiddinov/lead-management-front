import axios from 'axios'

// Use relative path for proxy in dev, or full URL for direct access
const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (credentials) => api.post('/auth/login', credentials)
export const getCurrentUser = () => api.get('/auth/me')
export const registerUser = (data) => api.post('/auth/register', data)

// Users (admin)
export const getUsers = () => api.get('/users')
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Dashboard
export const getDashboardStats = () => api.get('/dashboard')

// Leads
export const getLeads = (params) => api.get('/leads', { params })
export const getLead = (id) => api.get(`/leads/${id}`)
export const createLead = (data) => api.post('/leads', data)
export const updateLead = (id, data) => api.put(`/leads/${id}`, data)
export const deleteLead = (id) => api.delete(`/leads/${id}`)

// Activities
export const getLeadActivities = (leadId) => api.get(`/leads/${leadId}/activities`)
export const createActivity = (data) => api.post('/activities', data)

// Reminders
export const getAllReminders = (includeCompleted = false) =>
  api.get('/reminders', { params: { include_completed: includeCompleted } })
export const getPendingReminders = () => api.get('/reminders/pending')
export const getLeadReminders = (leadId) => api.get(`/leads/${leadId}/reminders`)
export const createReminder = (data) => api.post('/reminders', data)
export const updateReminder = (id, data) => api.put(`/reminders/${id}`, data)
export const markReminderNotified = (id) => api.post(`/reminders/${id}/mark-notified`)
export const deleteReminder = (id) => api.delete(`/reminders/${id}`)

// Options for filters
export const getStatusOptions = () => api.get('/options/statuses')
export const getSourceOptions = () => api.get('/options/sources')
export const getMonthOptions = () => api.get('/options/months')
export const getAssigneeOptions = () => api.get('/options/assignees')

// Status management
export const getStatuses = () => api.get('/statuses')
export const createStatus = (data) => api.post('/statuses', data)
export const updateStatus = (id, data) => api.put(`/statuses/${id}`, data)
export const deleteStatus = (id) => api.delete(`/statuses/${id}`)
export const reorderStatuses = (statusIds) => api.put('/statuses/reorder', statusIds)

// Import
export const importExcel = (file, source) => {
  const formData = new FormData()
  formData.append('file', file)
  if (source) {
    formData.append('source', source)
  }
  return api.post('/import/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export default api
