<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getLead,
  updateLead,
  deleteLead,
  createActivity,
  createReminder,
  updateReminder,
  deleteReminder,
  getStatuses
} from '../services/api'

const route = useRoute()
const router = useRouter()

const lead = ref(null)
const loading = ref(true)
const saving = ref(false)
const editMode = ref(false)
const editData = ref({})

// Activity
const newNote = ref('')
const addingNote = ref(false)

// Reminder
const showReminderModal = ref(false)
const newReminder = ref({
  title: '',
  description: '',
  remind_at: ''
})
const savingReminder = ref(false)

// Delete confirmation
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const fetchLead = async () => {
  try {
    loading.value = true
    const { data } = await getLead(route.params.id)
    lead.value = data
    editData.value = { ...data }
  } catch (err) {
    console.error('Failed to fetch lead:', err)
  } finally {
    loading.value = false
  }
}

const startEdit = () => {
  editData.value = { ...lead.value }
  editMode.value = true
}

const cancelEdit = () => {
  editData.value = { ...lead.value }
  editMode.value = false
}

const saveLead = async () => {
  try {
    saving.value = true
    const { data } = await updateLead(lead.value.id, editData.value)
    lead.value = data
    editMode.value = false
    // Refresh to get updated activities
    await fetchLead()
  } catch (err) {
    console.error('Failed to save lead:', err)
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  try {
    deleting.value = true
    await deleteLead(lead.value.id)
    router.push('/leads')
  } catch (err) {
    console.error('Failed to delete lead:', err)
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

const addNote = async () => {
  if (!newNote.value.trim()) return

  try {
    addingNote.value = true
    await createActivity({
      lead_id: lead.value.id,
      action: 'note_added',
      description: newNote.value
    })
    newNote.value = ''
    await fetchLead()
  } catch (err) {
    console.error('Failed to add note:', err)
  } finally {
    addingNote.value = false
  }
}

const logActivity = async (action, description) => {
  try {
    await createActivity({
      lead_id: lead.value.id,
      action,
      description
    })
    await fetchLead()
  } catch (err) {
    console.error('Failed to log activity:', err)
  }
}

const openReminderModal = () => {
  // Default to 1 hour from now
  const date = new Date()
  date.setHours(date.getHours() + 1)
  newReminder.value = {
    title: '',
    description: '',
    remind_at: date.toISOString().slice(0, 16)
  }
  showReminderModal.value = true
}

const saveReminder = async () => {
  if (!newReminder.value.title || !newReminder.value.remind_at) return

  try {
    savingReminder.value = true
    await createReminder({
      lead_id: lead.value.id,
      title: newReminder.value.title,
      description: newReminder.value.description,
      remind_at: new Date(newReminder.value.remind_at).toISOString()
    })
    showReminderModal.value = false
    await fetchLead()
  } catch (err) {
    console.error('Failed to create reminder:', err)
  } finally {
    savingReminder.value = false
  }
}

const completeReminder = async (reminder) => {
  try {
    await updateReminder(reminder.id, { is_completed: true })
    await fetchLead()
  } catch (err) {
    console.error('Failed to complete reminder:', err)
  }
}

const removeReminder = async (reminder) => {
  try {
    await deleteReminder(reminder.id)
    await fetchLead()
  } catch (err) {
    console.error('Failed to delete reminder:', err)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

const formatDateShort = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

const statusOptions = ref([])
const sourceOptions = ['facebook', 'instagram', 'form', 'target', 'organic', 'referral', 'other']

const fetchStatuses = async () => {
  try {
    const { data } = await getStatuses()
    statusOptions.value = data
  } catch (err) {
    console.error('Failed to fetch statuses:', err)
    // Fallback to default statuses
    statusOptions.value = [
      { name: 'new', color: '#3b82f6' },
      { name: 'waiting_response', color: '#eab308' },
      { name: 'will_callback', color: '#f97316' },
      { name: 'not_answered', color: '#ef4444' },
      { name: 'audit', color: '#8b5cf6' },
      { name: 'won', color: '#22c55e' },
      { name: 'lost', color: '#ef4444' }
    ]
  }
}

const getStatusColor = (statusName) => {
  const status = statusOptions.value.find(s => s.name === statusName)
  return status?.color || '#6b7280'
}

const activeReminders = computed(() => {
  if (!lead.value?.reminders) return []
  return lead.value.reminders.filter(r => !r.is_completed)
})

const completedReminders = computed(() => {
  if (!lead.value?.reminders) return []
  return lead.value.reminders.filter(r => r.is_completed)
})

onMounted(() => {
  fetchLead()
  fetchStatuses()
})
</script>

<template>
  <div class="lead-detail">
    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading lead...</p>
    </div>

    <!-- Content -->
    <template v-else-if="lead">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <button class="btn btn-ghost" @click="router.push('/leads')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <div class="lead-title">
            <h2>{{ lead.name || lead.company || 'Lead #' + lead.id }}</h2>
            <span class="badge" :style="{ backgroundColor: getStatusColor(lead.status) + '20', color: getStatusColor(lead.status), borderColor: getStatusColor(lead.status) + '40' }">{{ lead.status || 'unknown' }}</span>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="!editMode" class="btn btn-secondary" @click="startEdit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <template v-else>
            <button class="btn btn-ghost" @click="cancelEdit">Cancel</button>
            <button class="btn btn-primary" @click="saveLead" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </template>
          <button class="btn btn-danger" @click="showDeleteConfirm = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="content-grid">
        <!-- Main Info -->
        <div class="main-column">
          <!-- Lead Info Card -->
          <div class="card info-card">
            <div class="card-header">
              <h3>Lead Information</h3>
            </div>

            <div class="info-grid" v-if="!editMode">
              <div class="info-item">
                <label>Name</label>
                <span>{{ lead.name || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Company</label>
                <span>{{ lead.company || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Phone</label>
                <span class="font-mono">{{ lead.phone || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Email</label>
                <span>{{ lead.email || '-' }}</span>
              </div>
              <div class="info-item">
                <label>DOT Number</label>
                <span class="font-mono">{{ lead.dot_number || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Number of Trucks</label>
                <span>{{ lead.number_of_trucks || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Cash Flow</label>
                <span>{{ lead.cash_flow || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Has Accounting</label>
                <span>{{ lead.has_accounting || '-' }}</span>
              </div>
              <div class="info-item">
                <label>English Knowledge</label>
                <span>{{ lead.english_knowledge || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Living Address</label>
                <span>{{ lead.living_address || '-' }}</span>
              </div>
              <div class="info-item">
                <label>6 Month Truck Goal</label>
                <span>{{ lead.next_6_months_truck_goal || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Status</label>
                <span class="badge" :style="{ backgroundColor: getStatusColor(lead.status) + '20', color: getStatusColor(lead.status), borderColor: getStatusColor(lead.status) + '40' }">{{ lead.status || 'unknown' }}</span>
              </div>
              <div class="info-item">
                <label>Source</label>
                <span>{{ lead.source || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Source Month</label>
                <span>{{ lead.source_month || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Assigned To</label>
                <span>{{ lead.assigned_to || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Created</label>
                <span>{{ formatDate(lead.created_at) }}</span>
              </div>
            </div>

            <!-- Edit Form -->
            <div class="edit-form" v-else>
              <div class="form-row">
                <div class="form-group">
                  <label>Name</label>
                  <input type="text" v-model="editData.name" />
                </div>
                <div class="form-group">
                  <label>Company</label>
                  <input type="text" v-model="editData.company" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Phone</label>
                  <input type="text" v-model="editData.phone" />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" v-model="editData.email" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>DOT Number</label>
                  <input type="text" v-model="editData.dot_number" />
                </div>
                <div class="form-group">
                  <label>Number of Trucks</label>
                  <input type="text" v-model="editData.number_of_trucks" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Cash Flow</label>
                  <input type="text" v-model="editData.cash_flow" />
                </div>
                <div class="form-group">
                  <label>Has Accounting</label>
                  <input type="text" v-model="editData.has_accounting" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>English Knowledge</label>
                  <input type="text" v-model="editData.english_knowledge" />
                </div>
                <div class="form-group">
                  <label>Living Address</label>
                  <input type="text" v-model="editData.living_address" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>6 Month Truck Goal</label>
                  <input type="text" v-model="editData.next_6_months_truck_goal" />
                </div>
                <div class="form-group">
                  <label>Assigned To</label>
                  <input type="text" v-model="editData.assigned_to" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Status</label>
                  <select v-model="editData.status">
                    <option v-for="status in statusOptions" :key="status.name" :value="status.name">
                      {{ status.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Source</label>
                  <select v-model="editData.source">
                    <option v-for="source in sourceOptions" :key="source" :value="source">
                      {{ source }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea v-model="editData.notes" rows="4"></textarea>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="card" v-if="!editMode">
            <div class="card-header">
              <h3>Notes</h3>
            </div>
            <div class="notes-content">
              <p v-if="lead.notes">{{ lead.notes }}</p>
              <p v-else class="text-muted">No notes added yet.</p>
            </div>
          </div>

          <!-- Add Note -->
          <div class="card">
            <div class="card-header">
              <h3>Add Note / Activity</h3>
            </div>
            <div class="add-note-form">
              <textarea
                v-model="newNote"
                placeholder="Add a note about this lead..."
                rows="3"
              ></textarea>
              <div class="note-actions">
                <div class="quick-actions">
                  <button class="btn btn-sm btn-ghost" @click="logActivity('called', 'Made a phone call')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
                    </svg>
                    Log Call
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="logActivity('emailed', 'Sent an email')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Log Email
                  </button>
                </div>
                <button class="btn btn-primary" @click="addNote" :disabled="addingNote || !newNote.trim()">
                  {{ addingNote ? 'Adding...' : 'Add Note' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar-column">
          <!-- Reminders -->
          <div class="card">
            <div class="card-header">
              <h3>Reminders</h3>
              <button class="btn btn-sm btn-primary" @click="openReminderModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add
              </button>
            </div>

            <div class="reminders-section">
              <div v-if="activeReminders.length" class="reminder-list">
                <div v-for="reminder in activeReminders" :key="reminder.id" class="reminder-item">
                  <div class="reminder-check">
                    <button @click="completeReminder(reminder)" class="check-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </button>
                  </div>
                  <div class="reminder-content">
                    <div class="reminder-title">{{ reminder.title }}</div>
                    <div class="reminder-time" :class="{ overdue: new Date(reminder.remind_at) < new Date() }">
                      {{ formatDate(reminder.remind_at) }}
                    </div>
                    <div v-if="reminder.description" class="reminder-desc">{{ reminder.description }}</div>
                  </div>
                  <button class="btn-icon" @click="removeReminder(reminder)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div v-else class="empty-state">
                <p>No active reminders</p>
              </div>

              <div v-if="completedReminders.length" class="completed-section">
                <div class="completed-header">Completed</div>
                <div v-for="reminder in completedReminders" :key="reminder.id" class="reminder-item completed">
                  <div class="reminder-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div class="reminder-content">
                    <div class="reminder-title">{{ reminder.title }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Activity Log -->
          <div class="card">
            <div class="card-header">
              <h3>Activity Log</h3>
            </div>

            <div class="activity-timeline" v-if="lead.activities?.length">
              <div
                v-for="activity in lead.activities"
                :key="activity.id"
                class="timeline-item"
              >
                <div class="timeline-dot" :class="`action-${activity.action}`"></div>
                <div class="timeline-content">
                  <div class="timeline-text">{{ activity.description }}</div>
                  <div v-if="activity.old_value || activity.new_value" class="timeline-change">
                    <span class="old-value">{{ activity.old_value }}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                    <span class="new-value">{{ activity.new_value }}</span>
                  </div>
                  <div class="timeline-time">{{ formatDate(activity.created_at) }}</div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No activities recorded</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Reminder Modal -->
    <div v-if="showReminderModal" class="modal-overlay" @click.self="showReminderModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Set Reminder</h3>
          <button class="modal-close" @click="showReminderModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveReminder" class="modal-form">
          <div class="form-group">
            <label>Title</label>
            <input type="text" v-model="newReminder.title" placeholder="e.g., Follow up call" required />
          </div>

          <div class="form-group">
            <label>Remind At</label>
            <input type="datetime-local" v-model="newReminder.remind_at" required />
          </div>

          <div class="form-group">
            <label>Description (optional)</label>
            <textarea v-model="newReminder.description" placeholder="Add any details..." rows="3"></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showReminderModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="savingReminder">
              {{ savingReminder ? 'Saving...' : 'Set Reminder' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3 class="modal-title">Delete Lead</h3>
        </div>
        <p>Are you sure you want to delete this lead? This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
          <button class="btn btn-danger" @click="handleDelete" :disabled="deleting">
            {{ deleting ? 'Deleting...' : 'Delete Lead' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lead-detail {
  animation: fadeIn 0.3s ease;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.lead-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lead-title h2 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn svg {
  width: 18px;
  height: 18px;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Info Card */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.info-item span {
  color: var(--text-primary);
}

/* Edit Form */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

/* Notes */
.notes-content {
  line-height: 1.7;
  white-space: pre-wrap;
}

/* Add Note */
.add-note-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.quick-actions .btn svg {
  width: 16px;
  height: 16px;
}

/* Reminders */
.reminders-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.reminder-item.completed {
  opacity: 0.6;
}

.reminder-check {
  flex-shrink: 0;
}

.check-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.check-btn:hover {
  color: var(--success);
}

.check-btn svg {
  width: 20px;
  height: 20px;
}

.reminder-check svg {
  width: 20px;
  height: 20px;
  color: var(--success);
}

.reminder-content {
  flex: 1;
  min-width: 0;
}

.reminder-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.reminder-time {
  font-size: 12px;
  color: var(--text-muted);
}

.reminder-time.overdue {
  color: var(--danger);
}

.reminder-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.btn-icon:hover {
  background: var(--bg-elevated);
  color: var(--danger);
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.completed-section {
  border-top: 1px solid var(--border-secondary);
  padding-top: 16px;
}

.completed-header {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* Activity Timeline */
.activity-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-secondary);
}

.timeline-item:last-child {
  border-bottom: none;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-muted);
  margin-top: 6px;
  flex-shrink: 0;
}

.timeline-dot.action-created,
.timeline-dot.action-imported {
  background: var(--success);
}

.timeline-dot.action-updated {
  background: var(--info);
}

.timeline-dot.action-note_added {
  background: var(--accent-primary);
}

.timeline-dot.action-called {
  background: var(--warning);
}

.timeline-dot.action-emailed {
  background: #a855f7;
}

.timeline-dot.action-reminder_created {
  background: var(--accent-primary);
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-text {
  color: var(--text-primary);
  margin-bottom: 4px;
}

.timeline-change {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 4px;
}

.timeline-change svg {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
}

.old-value {
  color: var(--danger);
  text-decoration: line-through;
}

.new-value {
  color: var(--success);
}

.timeline-time {
  font-size: 12px;
  color: var(--text-muted);
}

/* Modal */
.modal-sm {
  max-width: 400px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .sidebar-column {
    order: -1;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
