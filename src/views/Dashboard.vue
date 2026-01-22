<script setup>
import { ref, onMounted, computed } from 'vue'
import { getDashboardStats } from '../services/api'
import { RouterLink } from 'vue-router'

const stats = ref(null)
const loading = ref(true)
const error = ref(null)

const fetchStats = async () => {
  try {
    loading.value = true
    const { data } = await getDashboardStats()
    stats.value = data
  } catch (err) {
    error.value = 'Failed to load dashboard stats'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const statusColors = {
  new: 'var(--info)',
  waiting_response: 'var(--warning)',
  will_callback: '#f97316',
  not_answered: '#ef4444',
  audit: '#a855f7',
  won: 'var(--success)',
  lost: 'var(--danger)',
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString()
}

onMounted(fetchStats)
</script>

<template>
  <div class="dashboard">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="fetchStats">Retry</button>
    </div>

    <!-- Dashboard Content -->
    <template v-else-if="stats">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card stat-total">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total_leads }}</div>
            <div class="stat-label">Total Leads</div>
          </div>
        </div>

        <div class="stat-card stat-won">
          <div class="stat-icon icon-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.leads_by_status.won || 0 }}</div>
            <div class="stat-label">Won</div>
          </div>
        </div>

        <div class="stat-card stat-new">
          <div class="stat-icon icon-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.leads_by_status.new || 0 }}</div>
            <div class="stat-label">New Leads</div>
          </div>
        </div>

        <div class="stat-card stat-contacted">
          <div class="stat-icon icon-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.leads_by_status.contacted || 0 }}</div>
            <div class="stat-label">Contacted</div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <!-- By Status -->
        <div class="card chart-card">
          <div class="card-header">
            <h3>Leads by Status</h3>
            <RouterLink to="/leads" class="btn btn-sm btn-ghost">View All</RouterLink>
          </div>
          <div class="status-chart">
            <div
              v-for="(count, status) in stats.leads_by_status"
              :key="status"
              class="status-bar-item"
            >
              <div class="status-bar-label">
                <span class="badge" :class="`badge-${status}`">{{ status }}</span>
                <span class="status-count">{{ count }}</span>
              </div>
              <div class="status-bar-track">
                <div
                  class="status-bar-fill"
                  :style="{
                    width: `${(count / stats.total_leads) * 100}%`,
                    background: statusColors[status] || 'var(--text-muted)'
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- By Source -->
        <div class="card chart-card">
          <div class="card-header">
            <h3>Leads by Source</h3>
          </div>
          <div class="source-grid">
            <div
              v-for="(count, source) in stats.leads_by_source"
              :key="source"
              class="source-item"
            >
              <div class="source-icon" :class="`source-${source}`">
                <svg v-if="source === 'facebook'" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
                <svg v-else-if="source === 'instagram'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div class="source-info">
                <div class="source-value">{{ count }}</div>
                <div class="source-name">{{ source }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- By Month -->
      <div class="card chart-card">
        <div class="card-header">
          <h3>Leads by Month</h3>
        </div>
        <div class="month-chart">
          <div
            v-for="(count, month) in stats.leads_by_month"
            :key="month"
            class="month-bar"
          >
            <div class="month-bar-fill" :style="{ height: `${Math.max((count / stats.total_leads) * 200, 20)}px` }">
              <span class="month-count">{{ count }}</span>
            </div>
            <div class="month-label">{{ month }}</div>
          </div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="bottom-row">
        <!-- Recent Activities -->
        <div class="card">
          <div class="card-header">
            <h3>Recent Activities</h3>
          </div>
          <div class="activities-list" v-if="stats.recent_activities.length">
            <div
              v-for="activity in stats.recent_activities"
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon" :class="`action-${activity.action}`">
                <svg v-if="activity.action === 'created' || activity.action === 'imported'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <svg v-else-if="activity.action === 'updated'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div class="activity-content">
                <div class="activity-text">{{ activity.description }}</div>
                <div class="activity-time">{{ formatDate(activity.created_at) }}</div>
              </div>
              <RouterLink :to="`/leads/${activity.lead_id}`" class="btn btn-sm btn-ghost">
                View
              </RouterLink>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>No recent activities</p>
          </div>
        </div>

        <!-- Upcoming Reminders -->
        <div class="card">
          <div class="card-header">
            <h3>Upcoming Reminders</h3>
          </div>
          <div class="reminders-list" v-if="stats.upcoming_reminders.length">
            <div
              v-for="reminder in stats.upcoming_reminders"
              :key="reminder.id"
              class="reminder-item"
            >
              <div class="reminder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div class="reminder-content">
                <div class="reminder-title">{{ reminder.title }}</div>
                <div class="reminder-time">{{ formatDate(reminder.remind_at) }}</div>
              </div>
              <RouterLink :to="`/leads/${reminder.lead_id}`" class="btn btn-sm btn-primary">
                View Lead
              </RouterLink>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>No upcoming reminders</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  animation: fadeIn 0.3s ease;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  animation: fadeIn 0.3s ease;
  animation-fill-mode: both;
}

.stat-card:nth-child(1) { animation-delay: 0.05s; }
.stat-card:nth-child(2) { animation-delay: 0.1s; }
.stat-card:nth-child(3) { animation-delay: 0.15s; }
.stat-card:nth-child(4) { animation-delay: 0.2s; }

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--accent-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 28px;
  height: 28px;
  color: var(--accent-primary);
}

.stat-icon.icon-success {
  background: var(--success-bg);
}

.stat-icon.icon-success svg {
  color: var(--success);
}

.stat-icon.icon-info {
  background: var(--info-bg);
}

.stat-icon.icon-info svg {
  color: var(--info);
}

.stat-icon.icon-warning {
  background: var(--warning-bg);
}

.stat-icon.icon-warning svg {
  color: var(--warning);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Charts Row */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.chart-card {
  animation: fadeIn 0.3s ease 0.25s;
  animation-fill-mode: both;
}

/* Status Chart */
.status-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-bar-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-bar-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-count {
  font-weight: 600;
  color: var(--text-primary);
}

.status-bar-track {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* Source Grid */
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.source-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  text-align: center;
}

.source-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  background: var(--bg-elevated);
}

.source-icon svg {
  width: 24px;
  height: 24px;
  color: var(--text-secondary);
}

.source-icon.source-facebook {
  background: rgba(59, 89, 152, 0.2);
}

.source-icon.source-facebook svg {
  color: #3b5998;
}

.source-icon.source-instagram {
  background: linear-gradient(135deg, rgba(240, 148, 51, 0.2), rgba(197, 43, 137, 0.2));
}

.source-icon.source-instagram svg {
  color: #c13584;
}

.source-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.source-name {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: capitalize;
}

/* Month Chart */
.month-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 200px;
  padding-top: 20px;
}

.month-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.month-bar-fill {
  width: 100%;
  background: linear-gradient(180deg, var(--accent-primary), var(--accent-hover));
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
  min-height: 30px;
  transition: height 0.5s ease;
}

.month-count {
  font-size: 12px;
  font-weight: 600;
  color: #000;
}

.month-label {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* Bottom Row */
.bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.bottom-row .card {
  animation: fadeIn 0.3s ease 0.35s;
  animation-fill-mode: both;
}

/* Activities List */
.activities-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-secondary);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
}

.activity-icon svg {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.activity-icon.action-created,
.activity-icon.action-imported {
  background: var(--success-bg);
}

.activity-icon.action-created svg,
.activity-icon.action-imported svg {
  color: var(--success);
}

.activity-icon.action-updated {
  background: var(--info-bg);
}

.activity-icon.action-updated svg {
  color: var(--info);
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: var(--text-primary);
  margin-bottom: 2px;
}

.activity-time {
  font-size: 12px;
  color: var(--text-muted);
}

/* Reminders List */
.reminders-list {
  display: flex;
  flex-direction: column;
}

.reminder-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-secondary);
}

.reminder-item:last-child {
  border-bottom: none;
}

.reminder-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-muted);
}

.reminder-icon svg {
  width: 18px;
  height: 18px;
  color: var(--accent-primary);
}

.reminder-content {
  flex: 1;
}

.reminder-title {
  color: var(--text-primary);
  margin-bottom: 2px;
}

.reminder-time {
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row,
  .bottom-row {
    grid-template-columns: 1fr;
  }
}
</style>
