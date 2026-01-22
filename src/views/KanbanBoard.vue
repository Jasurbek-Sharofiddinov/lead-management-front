<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getLeads,
  updateLead,
  createReminder,
  createActivity,
  getStatuses
} from '../services/api'

const router = useRouter()

// Data
const leads = ref([])
const loading = ref(true)
const statuses = ref([])

// Filters
const dateFrom = ref('')
const dateTo = ref('')
const searchQuery = ref('')

// Quick action modals
const showReminderModal = ref(false)
const showNoteModal = ref(false)
const selectedLead = ref(null)
const newReminder = ref({ title: '', description: '', remind_at: '' })
const newNote = ref('')
const saving = ref(false)

// Kanban columns configuration
// Includes variations of status names for compatibility
const kanbanColumns = [
  {
    id: 'new',
    title: 'New Lead',
    statuses: ['new', 'New Lead', 'created', null, undefined, ''],
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)'
  },
  {
    id: 'contacting',
    title: 'Contacting',
    statuses: ['waiting_response', 'will_callback', 'not_answered', 'call again', 'thinking', 'no info', 'not answered'],
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    subStatuses: [
      { id: 'waiting_response', label: 'Waiting Response', matchStatuses: ['waiting_response'], color: '#eab308' },
      { id: 'will_callback', label: 'Will Callback', matchStatuses: ['will_callback', 'call again', 'thinking'], color: '#f97316' },
      { id: 'not_answered', label: 'Not Answered', matchStatuses: ['not_answered', 'not answered', 'no info'], color: '#ef4444' }
    ]
  },
  {
    id: 'audit',
    title: 'Audit',
    statuses: ['audit', 'good'],
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)'
  },
  {
    id: 'won',
    title: 'Won',
    statuses: ['won'],
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)'
  },
  {
    id: 'lost',
    title: 'Lost',
    statuses: ['lost', 'no need'],
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)'
  }
]

// Error state
const error = ref(null)

// Fetch all leads (handles pagination since API max is 100)
const fetchLeads = async () => {
  try {
    loading.value = true
    error.value = null

    let allLeads = []
    let currentPage = 1
    let totalPages = 1

    // Fetch all pages
    do {
      const params = {
        page: currentPage,
        page_size: 100,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
      if (searchQuery.value) params.search = searchQuery.value

      const { data } = await getLeads(params)
      allLeads = allLeads.concat(data.leads || [])
      totalPages = data.total_pages || 1
      currentPage++
    } while (currentPage <= totalPages)

    leads.value = allLeads
  } catch (err) {
    console.error('Failed to fetch leads:', err)
    error.value = err.response?.data?.detail || err.message || 'Failed to load leads'
  } finally {
    loading.value = false
  }
}

// Fetch statuses
const fetchStatuses = async () => {
  try {
    const { data } = await getStatuses()
    statuses.value = data
  } catch (err) {
    console.error('Failed to fetch statuses:', err)
  }
}

// Filter leads by date
const filteredLeads = computed(() => {
  let result = leads.value

  if (dateFrom.value) {
    const from = new Date(dateFrom.value)
    result = result.filter(lead => new Date(lead.created_at) >= from)
  }

  if (dateTo.value) {
    const to = new Date(dateTo.value)
    to.setHours(23, 59, 59, 999)
    result = result.filter(lead => new Date(lead.created_at) <= to)
  }

  return result
})

// Get leads for a column
const getColumnLeads = (column) => {
  return filteredLeads.value.filter(lead => {
    const status = lead.status
    // Handle null/undefined/empty status - goes to New Lead column
    if (!status || status === '') {
      return column.id === 'new'
    }
    return column.statuses.includes(status)
  })
}

// Get leads for a sub-status within Contacting
const getSubStatusLeads = (subStatus) => {
  const matchStatuses = subStatus.matchStatuses || [subStatus.id]
  return filteredLeads.value.filter(lead => matchStatuses.includes(lead.status))
}

// Drag and Drop
const draggedLead = ref(null)
const dragOverColumn = ref(null)
const dragOverSubStatus = ref(null)

const onDragStart = (event, lead) => {
  draggedLead.value = lead
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
}

const onDragEnd = (event) => {
  event.target.classList.remove('dragging')
  draggedLead.value = null
  dragOverColumn.value = null
  dragOverSubStatus.value = null
}

const onDragOver = (event, columnId, subStatusId = null) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverColumn.value = columnId
  dragOverSubStatus.value = subStatusId
}

const onDragLeave = () => {
  dragOverColumn.value = null
  dragOverSubStatus.value = null
}

const onDrop = async (event, column, subStatusId = null) => {
  event.preventDefault()

  if (!draggedLead.value) return

  let newStatus = subStatusId || column.statuses[0]
  const leadId = draggedLead.value.id
  const oldStatus = draggedLead.value.status

  if (oldStatus === newStatus) {
    draggedLead.value = null
    dragOverColumn.value = null
    dragOverSubStatus.value = null
    return
  }

  // Optimistic update - update local state IMMEDIATELY
  const lead = leads.value.find(l => l.id === leadId)
  if (lead) {
    lead.status = newStatus
  }

  // Clear drag state
  draggedLead.value = null
  dragOverColumn.value = null
  dragOverSubStatus.value = null

  // Then sync with server
  try {
    await updateLead(leadId, { status: newStatus })
  } catch (err) {
    console.error('Failed to update lead status:', err)
    // Revert on error
    if (lead) {
      lead.status = oldStatus
    }
  }
}

// Quick Actions
const openReminderModal = (lead) => {
  selectedLead.value = lead
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
    saving.value = true
    await createReminder({
      lead_id: selectedLead.value.id,
      title: newReminder.value.title,
      description: newReminder.value.description,
      remind_at: new Date(newReminder.value.remind_at).toISOString()
    })
    showReminderModal.value = false
    selectedLead.value = null
  } catch (err) {
    console.error('Failed to create reminder:', err)
  } finally {
    saving.value = false
  }
}

const openNoteModal = (lead) => {
  selectedLead.value = lead
  newNote.value = ''
  showNoteModal.value = true
}

const saveNote = async () => {
  if (!newNote.value.trim()) return

  try {
    saving.value = true
    await createActivity({
      lead_id: selectedLead.value.id,
      action: 'note_added',
      description: newNote.value
    })
    showNoteModal.value = false
    selectedLead.value = null
    newNote.value = ''
  } catch (err) {
    console.error('Failed to add note:', err)
  } finally {
    saving.value = false
  }
}

const goToLead = (lead) => {
  router.push(`/leads/${lead.id}`)
}

const getStatusColor = (status) => {
  const colors = {
    new: '#3b82f6',
    waiting_response: '#eab308',
    will_callback: '#f97316',
    not_answered: '#ef4444',
    audit: '#8b5cf6',
    won: '#22c55e',
    lost: '#ef4444'
  }
  return colors[status] || '#6b7280'
}

const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
}

const clearFilters = () => {
  dateFrom.value = ''
  dateTo.value = ''
  searchQuery.value = ''
}

// Watch for search changes with debounce
let searchTimeout = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchLeads, 300)
})

onMounted(() => {
  fetchLeads()
  fetchStatuses()
})
</script>

<template>
  <div class="kanban-page">
    <!-- Header -->
    <div class="kanban-header">
      <div class="header-left">
        <h2>Lead Pipeline</h2>
        <span class="lead-count">{{ filteredLeads.length }} leads</span>
      </div>

      <div class="header-filters">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search leads..."
          />
        </div>

        <div class="date-filters">
          <div class="date-input">
            <label>From</label>
            <input type="date" v-model="dateFrom" />
          </div>
          <div class="date-input">
            <label>To</label>
            <input type="date" v-model="dateTo" />
          </div>
          <button
            v-if="dateFrom || dateTo || searchQuery"
            class="btn btn-ghost btn-sm"
            @click="clearFilters"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading leads...</p>
    </div>

    <!-- Kanban Board -->
    <div v-else class="kanban-board">
      <div
        v-for="column in kanbanColumns"
        :key="column.id"
        class="kanban-column"
        :class="{ 'drag-over': dragOverColumn === column.id && !column.subStatuses }"
        @dragover="!column.subStatuses && onDragOver($event, column.id)"
        @dragleave="onDragLeave"
        @drop="!column.subStatuses && onDrop($event, column)"
      >
        <div class="column-header" :style="{ borderColor: column.color }">
          <div class="column-title">
            <span class="column-dot" :style="{ background: column.color }"></span>
            {{ column.title }}
          </div>
          <span class="column-count">{{ getColumnLeads(column).length }}</span>
        </div>

        <!-- Regular column (no sub-statuses) -->
        <div v-if="!column.subStatuses" class="column-content">
          <div
            v-for="lead in getColumnLeads(column)"
            :key="lead.id"
            class="lead-card"
            draggable="true"
            @dragstart="onDragStart($event, lead)"
            @dragend="onDragEnd"
            @click="goToLead(lead)"
          >
            <div class="lead-card-header">
              <span class="lead-name">{{ lead.name || lead.company || 'No Name' }}</span>
              <div class="lead-actions" @click.stop>
                <button class="action-btn" @click="openNoteModal(lead)" title="Add Note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="action-btn" @click="openReminderModal(lead)" title="Set Reminder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="lead.company && lead.name" class="lead-company">{{ lead.company }}</div>
            <div class="lead-info">
              <span v-if="lead.phone" class="lead-phone">{{ formatPhone(lead.phone) }}</span>
              <span v-if="lead.source" class="lead-source">{{ lead.source }}</span>
            </div>
          </div>

          <div v-if="getColumnLeads(column).length === 0" class="empty-column">
            <p>No leads</p>
          </div>
        </div>

        <!-- Contacting column with sub-statuses -->
        <div v-else class="column-content sub-status-content">
          <div
            v-for="subStatus in column.subStatuses"
            :key="subStatus.id"
            class="sub-status-section"
            :class="{ 'drag-over': dragOverSubStatus === subStatus.id }"
            @dragover="onDragOver($event, column.id, subStatus.id)"
            @dragleave="onDragLeave"
            @drop="onDrop($event, column, subStatus.id)"
          >
            <div class="sub-status-header">
              <span class="sub-dot" :style="{ background: subStatus.color }"></span>
              <span class="sub-label">{{ subStatus.label }}</span>
              <span class="sub-count">{{ getSubStatusLeads(subStatus).length }}</span>
            </div>

            <div class="sub-status-leads">
              <div
                v-for="lead in getSubStatusLeads(subStatus)"
                :key="lead.id"
                class="lead-card lead-card-sm"
                draggable="true"
                @dragstart="onDragStart($event, lead)"
                @dragend="onDragEnd"
                @click="goToLead(lead)"
              >
                <div class="lead-card-header">
                  <span class="lead-name">{{ lead.name || lead.company || 'No Name' }}</span>
                  <div class="lead-actions" @click.stop>
                    <button class="action-btn" @click="openNoteModal(lead)" title="Add Note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="action-btn" @click="openReminderModal(lead)" title="Set Reminder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="lead-info">
                  <span v-if="lead.phone" class="lead-phone">{{ formatPhone(lead.phone) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
        <p class="modal-lead-name">{{ selectedLead?.name || selectedLead?.company }}</p>

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
            <button type="button" class="btn btn-secondary" @click="showReminderModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Set Reminder' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Note Modal -->
    <div v-if="showNoteModal" class="modal-overlay" @click.self="showNoteModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Add Note</h3>
          <button class="modal-close" @click="showNoteModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p class="modal-lead-name">{{ selectedLead?.name || selectedLead?.company }}</p>

        <form @submit.prevent="saveNote" class="modal-form">
          <div class="form-group">
            <label>Note</label>
            <textarea v-model="newNote" placeholder="Add a note about this lead..." rows="4" required></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showNoteModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving || !newNote.trim()">
              {{ saving ? 'Saving...' : 'Add Note' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-page {
  height: calc(100vh - 134px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.kanban-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2 {
  margin: 0;
}

.lead-count {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-muted);
}

.header-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  width: 240px;
}

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.search-box input {
  padding-left: 40px;
  height: 40px;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-input {
  display: flex;
  flex-direction: column;
}

.date-input label {
  font-size: 11px;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.date-input input {
  width: 150px;
  height: 40px;
  padding: 8px 12px;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
}

/* Kanban Board */
.kanban-board {
  display: flex;
  gap: 16px;
  flex: 1;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-column {
  min-width: 300px;
  max-width: 300px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.kanban-column.drag-over {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-muted);
}

.column-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
  border-left: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
}

.column-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.column-count {
  padding: 2px 10px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.column-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-column {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted);
  font-size: 13px;
}

/* Sub-status sections (Contacting column) */
.sub-status-content {
  gap: 0;
}

.sub-status-section {
  padding: 12px;
  border-bottom: 1px solid var(--border-secondary);
  transition: all 0.2s ease;
}

.sub-status-section:last-child {
  border-bottom: none;
}

.sub-status-section.drag-over {
  background: var(--accent-muted);
}

.sub-status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.sub-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.sub-label {
  flex: 1;
}

.sub-count {
  padding: 1px 8px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-size: 11px;
}

.sub-status-leads {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px;
}

/* Lead Cards */
.lead-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-md);
  padding: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lead-card:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.lead-card.dragging {
  opacity: 0.5;
  transform: rotate(3deg);
}

.lead-card-sm {
  padding: 10px 12px;
}

.lead-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.lead-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.3;
}

.lead-card-sm .lead-name {
  font-size: 13px;
}

.lead-card-sm .lead-card-header {
  margin-bottom: 4px;
}

.lead-company {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.lead-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.lead-phone {
  font-family: var(--font-mono);
}

.lead-source {
  padding: 2px 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  text-transform: capitalize;
}

/* Lead Actions */
.lead-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.lead-card:hover .lead-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #000;
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

/* Modal */
.modal-lead-name {
  color: var(--text-secondary);
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-secondary);
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

/* Responsive */
@media (max-width: 1200px) {
  .kanban-column {
    min-width: 260px;
    max-width: 260px;
  }
}

@media (max-width: 768px) {
  .kanban-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-filters {
    width: 100%;
  }

  .search-box {
    width: 100%;
  }
}
</style>
