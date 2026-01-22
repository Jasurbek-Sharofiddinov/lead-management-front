import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import Dashboard from './views/Dashboard.vue'
import KanbanBoard from './views/KanbanBoard.vue'
import LeadsList from './views/LeadsList.vue'
import LeadDetail from './views/LeadDetail.vue'
import Import from './views/Import.vue'
import Settings from './views/Settings.vue'
import Login from './views/Login.vue'
import Profile from './views/Profile.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  { path: '/', name: 'Kanban', component: KanbanBoard },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/leads', name: 'Leads', component: LeadsList },
  { path: '/leads/:id', name: 'LeadDetail', component: LeadDetail },
  { path: '/import', name: 'Import', component: Import, meta: { adminOnly: true } },
  { path: '/settings', name: 'Settings', component: Settings, meta: { adminOnly: true } },
  { path: '/profile', name: 'Profile', component: Profile },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  // Public routes (login)
  if (to.meta.public) {
    if (token) {
      // Already logged in, redirect to dashboard
      next('/')
    } else {
      next()
    }
    return
  }

  // Check if authenticated
  if (!token) {
    next('/login')
    return
  }

  // Check admin-only routes
  if (to.meta.adminOnly && user?.role !== 'admin') {
    next('/')
    return
  }

  next()
})

const app = createApp(App)
app.use(router)
app.mount('#app')
