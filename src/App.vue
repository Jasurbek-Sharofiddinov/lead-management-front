<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { getPendingReminders, markReminderNotified } from './services/api'

const route = useRoute()
const router = useRouter()

const notifications = ref([])
const showNotifications = ref(false)
const showUserMenu = ref(false)
let pollInterval = null

// Theme
const isDarkMode = ref(true)

// User
const user = ref(null)
const isAdmin = computed(() => user.value?.role === 'admin')
const isLoggedIn = computed(() => !!user.value)
const isLoginPage = computed(() => route.path === '/login')

const loadUser = () => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    user.value = JSON.parse(storedUser)
  }
}

const loadTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark'
  }
  applyTheme()
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
  applyTheme()
}

const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  user.value = null
  showUserMenu.value = false
  router.push('/login')
}

const checkReminders = async () => {
  if (!isLoggedIn.value) return

  try {
    const { data } = await getPendingReminders()
    if (data.length > 0) {
      notifications.value = data
      // Play notification sound
      if (Notification.permission === 'granted') {
        data.forEach(reminder => {
          new Notification('Lead Reminder', {
            body: `${reminder.title} - ${reminder.lead_name || reminder.lead_company || 'Lead #' + reminder.lead_id}`,
            icon: '/favicon.ico'
          })
        })
      }
    }
  } catch (err) {
    console.error('Error checking reminders:', err)
  }
}

const dismissNotification = async (reminder) => {
  try {
    await markReminderNotified(reminder.id)
    notifications.value = notifications.value.filter(n => n.id !== reminder.id)
  } catch (err) {
    console.error('Error dismissing notification:', err)
  }
}

const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Watch for route changes to update user
watch(() => route.path, () => {
  loadUser()
})

onMounted(() => {
  loadUser()
  loadTheme()

  if (isLoggedIn.value) {
    requestNotificationPermission()
    checkReminders()
    pollInterval = setInterval(checkReminders, 30000) // Check every 30 seconds
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <!-- Login Page (no sidebar) -->
  <div v-if="isLoginPage" class="login-layout">
    <RouterView />
  </div>

  <!-- Main App Layout -->
  <div v-else class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-text">Wolfcity</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink to="/" class="nav-item" exact-active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </RouterLink>

        <RouterLink to="/leads" class="nav-item" active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Leads
        </RouterLink>

        <RouterLink v-if="isAdmin" to="/import" class="nav-item" active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Import
        </RouterLink>

        <RouterLink v-if="isAdmin" to="/settings" class="nav-item" active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="text-sm text-muted">Wolfcity Lead Management</div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-title">
          <h1>Wolfcity Lead Management</h1>
        </div>

        <div class="topbar-actions">
          <!-- Theme Toggle -->
          <button class="theme-toggle" @click="toggleTheme" :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
            <svg v-if="isDarkMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>

          <!-- Notification Bell -->
          <div class="notification-wrapper">
            <button
              class="notification-btn"
              @click="showNotifications = !showNotifications"
              :class="{ 'has-notifications': notifications.length > 0 }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span v-if="notifications.length" class="notification-badge">{{ notifications.length }}</span>
            </button>

            <!-- Notifications Dropdown -->
            <div v-if="showNotifications && notifications.length" class="notifications-dropdown">
              <div class="notifications-header">
                <span>Reminders</span>
                <button class="btn-ghost btn-sm" @click="showNotifications = false">Close</button>
              </div>
              <div class="notifications-list">
                <div
                  v-for="reminder in notifications"
                  :key="reminder.id"
                  class="notification-item"
                >
                  <div class="notification-content">
                    <strong>{{ reminder.title }}</strong>
                    <p>{{ reminder.lead_name || reminder.lead_company || 'Lead #' + reminder.lead_id }}</p>
                    <span class="text-sm text-muted">{{ new Date(reminder.remind_at).toLocaleString() }}</span>
                  </div>
                  <div class="notification-actions">
                    <RouterLink
                      :to="`/leads/${reminder.lead_id}`"
                      class="btn btn-sm btn-primary"
                      @click="showNotifications = false"
                    >
                      View
                    </RouterLink>
                    <button class="btn btn-sm btn-ghost" @click="dismissNotification(reminder)">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- User Menu -->
          <div class="user-menu-wrapper">
            <button class="user-menu-btn" @click="showUserMenu = !showUserMenu">
              <div class="user-avatar">
                {{ user?.username?.[0]?.toUpperCase() || 'U' }}
              </div>
              <span class="user-name">{{ user?.username || 'User' }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <div v-if="showUserMenu" class="user-dropdown">
              <div class="user-dropdown-header">
                <div class="user-info">
                  <strong>{{ user?.full_name || user?.username }}</strong>
                  <span class="user-role">{{ user?.role }}</span>
                </div>
              </div>
              <div class="user-dropdown-body">
                <RouterLink to="/profile" class="dropdown-item" @click="showUserMenu = false">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Profile Settings
                </RouterLink>
                <button class="dropdown-item" @click="logout">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="page-content">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-layout {
  min-height: 100vh;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-secondary);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  text-decoration: none;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-muted);
  color: var(--accent-primary);
}

.nav-item svg {
  width: 20px;
  height: 20px;
}

.sidebar-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-secondary);
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Topbar */
.topbar {
  height: 70px;
  padding: 0 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 40;
}

.topbar-title h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Theme Toggle */
.theme-toggle {
  width: 44px;
  height: 44px;
  padding: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--bg-elevated);
  color: var(--accent-primary);
}

.theme-toggle svg {
  width: 20px;
  height: 20px;
}

/* Notifications */
.notification-wrapper {
  position: relative;
}

.notification-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.notification-btn.has-notifications {
  border-color: var(--accent-primary);
  animation: pulse 2s infinite;
}

.notification-btn svg {
  width: 20px;
  height: 20px;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: var(--danger);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notifications-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 360px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: fadeIn 0.2s ease;
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
  font-weight: 600;
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-content {
  flex: 1;
}

.notification-content strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.notification-content p {
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.notification-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* User Menu */
.user-menu-wrapper {
  position: relative;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.user-menu-btn:hover {
  background: var(--bg-elevated);
}

.user-menu-btn svg {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--accent-primary);
  color: #000;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.user-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 220px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: fadeIn 0.2s ease;
}

.user-dropdown-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-info strong {
  font-size: 0.9375rem;
}

.user-role {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.user-dropdown-body {
  padding: 8px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
}

/* Page Content */
.page-content {
  flex: 1;
  padding: 32px;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
