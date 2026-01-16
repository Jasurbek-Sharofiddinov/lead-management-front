<script setup>
import { ref, onMounted } from 'vue'
import { getStatuses, createStatus, updateStatus, deleteStatus } from '../services/api'

const statuses = ref([])
const loading = ref(true)
const showAddModal = ref(false)
const editingStatus = ref(null)
const error = ref(null)
const successMessage = ref(null)

const newStatus = ref({
  name: '',
  color: '#6b7280',
  is_default: false
})

const fetchStatuses = async () => {
  try {
    loading.value = true
    const { data } = await getStatuses()
    statuses.value = data
  } catch (err) {
    error.value = 'Failed to load statuses'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, 3000)
}

const handleAddStatus = async () => {
  if (!newStatus.value.name.trim()) {
    error.value = 'Status name is required'
    return
  }

  try {
    await createStatus(newStatus.value)
    showAddModal.value = false
    newStatus.value = { name: '', color: '#6b7280', is_default: false }
    await fetchStatuses()
    showSuccess('Status created successfully')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to create status'
  }
}

const startEdit = (status) => {
  editingStatus.value = { ...status }
}

const cancelEdit = () => {
  editingStatus.value = null
}

const saveEdit = async () => {
  if (!editingStatus.value.name.trim()) {
    error.value = 'Status name is required'
    return
  }

  try {
    await updateStatus(editingStatus.value.id, {
      name: editingStatus.value.name,
      color: editingStatus.value.color,
      is_default: editingStatus.value.is_default
    })
    editingStatus.value = null
    await fetchStatuses()
    showSuccess('Status updated successfully')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to update status'
  }
}

const handleDelete = async (status) => {
  if (!confirm(`Are you sure you want to delete the status "${status.name}"?`)) {
    return
  }

  try {
    await deleteStatus(status.id)
    await fetchStatuses()
    showSuccess('Status deleted successfully')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to delete status'
  }
}

const setDefault = async (status) => {
  try {
    await updateStatus(status.id, { is_default: true })
    await fetchStatuses()
    showSuccess(`"${status.name}" is now the default status`)
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to set default status'
  }
}

const clearError = () => {
  error.value = null
}

onMounted(fetchStatuses)
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <div class="header-content">
        <h1>Settings</h1>
        <p class="text-secondary">Manage your lead statuses and system configuration</p>
      </div>
    </header>

    <!-- Success Message -->
    <div v-if="successMessage" class="alert alert-success">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      {{ successMessage }}
    </div>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {{ error }}
      <button class="btn-close" @click="clearError">&times;</button>
    </div>

    <!-- Status Management Section -->
    <section class="settings-section">
      <div class="section-header">
        <div>
          <h2>Lead Statuses</h2>
          <p class="text-secondary">Configure the statuses available for leads</p>
        </div>
        <button class="btn btn-primary" @click="showAddModal = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Status
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading statuses...</span>
      </div>

      <div v-else class="status-list">
        <div
          v-for="status in statuses"
          :key="status.id"
          class="status-item"
          :class="{ 'is-editing': editingStatus?.id === status.id }"
        >
          <!-- View Mode -->
          <template v-if="editingStatus?.id !== status.id">
            <div class="status-info">
              <div class="status-color" :style="{ backgroundColor: status.color }"></div>
              <span class="status-name">{{ status.name }}</span>
              <span v-if="status.is_default" class="default-badge">Default</span>
            </div>
            <div class="status-actions">
              <button
                v-if="!status.is_default"
                class="btn btn-sm btn-ghost"
                @click="setDefault(status)"
                title="Set as default"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
              <button class="btn btn-sm btn-ghost" @click="startEdit(status)" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                class="btn btn-sm btn-ghost btn-danger-text"
                @click="handleDelete(status)"
                title="Delete"
                :disabled="status.is_default"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </template>

          <!-- Edit Mode -->
          <template v-else>
            <div class="status-edit-form">
              <input
                type="color"
                v-model="editingStatus.color"
                class="color-picker"
              />
              <input
                type="text"
                v-model="editingStatus.name"
                class="form-input"
                placeholder="Status name"
              />
              <label class="checkbox-label">
                <input type="checkbox" v-model="editingStatus.is_default" />
                Default
              </label>
            </div>
            <div class="status-actions">
              <button class="btn btn-sm btn-primary" @click="saveEdit">Save</button>
              <button class="btn btn-sm btn-ghost" @click="cancelEdit">Cancel</button>
            </div>
          </template>
        </div>

        <div v-if="statuses.length === 0" class="empty-state">
          <p>No statuses configured. Add your first status to get started.</p>
        </div>
      </div>
    </section>

    <!-- Add Status Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Add New Status</h3>
          <button class="btn-close" @click="showAddModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Status Name</label>
            <input
              type="text"
              v-model="newStatus.name"
              class="form-input"
              placeholder="e.g., Follow Up, In Progress"
            />
          </div>
          <div class="form-group">
            <label>Color</label>
            <div class="color-input-group">
              <input
                type="color"
                v-model="newStatus.color"
                class="color-picker"
              />
              <input
                type="text"
                v-model="newStatus.color"
                class="form-input"
                placeholder="#6b7280"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newStatus.is_default" />
              Set as default status for new leads
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showAddModal = false">Cancel</button>
          <button class="btn btn-primary" @click="handleAddStatus">Add Status</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.text-secondary {
  color: var(--text-secondary);
}

/* Alerts */
.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
}

.alert svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.alert-success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: var(--success);
}

.alert-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
}

.alert .btn-close {
  margin-left: auto;
  background: none;
  border: none;
  color: inherit;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.7;
}

.alert .btn-close:hover {
  opacity: 1;
}

/* Settings Section */
.settings-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
}

/* Status List */
.status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.status-item:hover {
  border-color: var(--border-secondary);
}

.status-item.is-editing {
  border-color: var(--accent-primary);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-color {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.status-name {
  font-weight: 500;
  text-transform: capitalize;
}

.default-badge {
  background: var(--accent-muted);
  color: var(--accent-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.status-actions .btn svg {
  width: 16px;
  height: 16px;
}

.btn-danger-text {
  color: var(--danger);
}

.btn-danger-text:hover {
  background: rgba(239, 68, 68, 0.15);
}

.btn-danger-text:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Edit Form */
.status-edit-form {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.color-picker {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: transparent;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border-radius: var(--radius-sm);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary);
}

/* Loading State */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-primary);
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-primary);
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.color-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-input-group .form-input {
  flex: 1;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn svg {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
  color: #000;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
}

.btn-ghost:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8125rem;
}
</style>
