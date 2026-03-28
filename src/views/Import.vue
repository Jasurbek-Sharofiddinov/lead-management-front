<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  importExcel,
  getSourceOptions,
  getGoogleSheets,
  createGoogleSheet,
  updateGoogleSheet,
  deleteGoogleSheet,
  syncGoogleSheet,
  resetGoogleSheetSync,
  previewGoogleSheet
} from '../services/api'

const router = useRouter()

// Tab state
const activeTab = ref('excel')

// ==================== Excel Import ====================
const file = ref(null)
const source = ref('')
const sources = ref([])
const customSource = ref('')
const loading = ref(false)
const dragOver = ref(false)
const result = ref(null)
const error = ref(null)

const expectedColumns = [
  { name: 'name', description: 'Lead name or contact name' },
  { name: 'company', description: 'Company or business name' },
  { name: 'phone', description: 'Phone number' },
  { name: 'email', description: 'Email address' },
  { name: 'dot_number', description: 'DOT number' },
  { name: 'number_of_trucks', description: 'Fleet size' },
  { name: 'has_accounting', description: 'Do they have accounting?' },
  { name: 'source', description: 'Lead source (facebook, instagram, etc.)' },
  { name: 'notes', description: 'Additional notes' },
  { name: 'status', description: 'Lead status (defaults to "new")' },
]

const leadFields = [
  { value: '', label: '-- Skip --' },
  { value: 'name', label: 'Name' },
  { value: 'company', label: 'Company' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'dot_number', label: 'DOT Number' },
  { value: 'number_of_trucks', label: 'Number of Trucks' },
  { value: 'cash_flow', label: 'Cash Flow' },
  { value: 'has_accounting', label: 'Has Accounting' },
  { value: 'english_knowledge', label: 'English Knowledge' },
  { value: 'living_address', label: 'Living Address' },
  { value: 'source', label: 'Source' },
  { value: 'notes', label: 'Notes' },
  { value: 'status', label: 'Status' },
  { value: 'assigned_to', label: 'Assigned To' },
]

const fetchSources = async () => {
  try {
    const { data } = await getSourceOptions()
    sources.value = data
  } catch (err) {
    console.error('Failed to fetch sources:', err)
  }
}
fetchSources()

const handleDragOver = (e) => { e.preventDefault(); dragOver.value = true }
const handleDragLeave = () => { dragOver.value = false }
const handleDrop = (e) => {
  e.preventDefault()
  dragOver.value = false
  const f = e.dataTransfer.files[0]
  if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
    file.value = f; error.value = null
  } else {
    error.value = 'Please upload an Excel file (.xlsx or .xls)'
  }
}
const handleFileSelect = (e) => {
  if (e.target.files[0]) { file.value = e.target.files[0]; error.value = null }
}
const removeFile = () => { file.value = null; result.value = null }

const handleImport = async () => {
  if (!file.value) { error.value = 'Please select a file'; return }
  loading.value = true; error.value = null; result.value = null
  try {
    const src = source.value === 'custom' ? customSource.value : source.value
    const { data } = await importExcel(file.value, src || null)
    result.value = data
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to import file'
  } finally { loading.value = false }
}
const viewLeads = () => router.push('/leads')
const importAnother = () => {
  file.value = null; result.value = null; error.value = null
  source.value = ''; customSource.value = ''
}

// ==================== Google Sheets ====================
const sheets = ref([])
const sheetsLoading = ref(false)
const sheetsError = ref(null)
const syncingId = ref(null)
const syncResult = ref(null)

// Add/Edit form
const showForm = ref(false)
const editingSheet = ref(null)
const formStep = ref(1)
const formLoading = ref(false)
const formError = ref(null)
const formData = ref({
  name: '',
  url: '',
  source_label: '',
  sync_interval_minutes: 30,
})
const previewHeaders = ref([])
const previewSample = ref([])
const columnMapping = ref({})

const isEditing = computed(() => !!editingSheet.value)

const fetchSheets = async () => {
  sheetsLoading.value = true
  try {
    const { data } = await getGoogleSheets()
    sheets.value = data
  } catch (err) {
    sheetsError.value = err.response?.data?.detail || 'Failed to load sheets'
  } finally { sheetsLoading.value = false }
}

const openAddForm = () => {
  editingSheet.value = null
  formStep.value = 1
  formError.value = null
  formData.value = { name: '', url: '', source_label: '', sync_interval_minutes: 30 }
  previewHeaders.value = []
  previewSample.value = []
  columnMapping.value = {}
  showForm.value = true
}

const openEditForm = (sheet) => {
  editingSheet.value = sheet
  formStep.value = 2
  formError.value = null
  formData.value = {
    name: sheet.name,
    url: '',
    source_label: sheet.source_label || '',
    sync_interval_minutes: sheet.sync_interval_minutes,
  }
  // Restore existing mapping
  try {
    const mapping = sheet.column_mapping ? JSON.parse(sheet.column_mapping) : {}
    columnMapping.value = mapping
    previewHeaders.value = Object.keys(mapping)
  } catch { columnMapping.value = {} }
  showForm.value = true
}

const fetchPreview = async () => {
  if (!formData.value.url) { formError.value = 'Please enter a URL'; return }
  formLoading.value = true; formError.value = null
  try {
    const { data } = await previewGoogleSheet(formData.value.url)
    previewHeaders.value = data.headers
    previewSample.value = data.sample_rows
    // Auto-map headers that match lead field names
    const mapping = {}
    for (const h of data.headers) {
      const lower = h.toLowerCase().replace(/\s+/g, '_')
      const match = leadFields.find(f => f.value && f.value === lower)
      mapping[h] = match ? match.value : ''
    }
    columnMapping.value = mapping
    formStep.value = 2
  } catch (err) {
    formError.value = err.response?.data?.detail || 'Failed to fetch sheet. Make sure it is shared as "Anyone with the link".'
  } finally { formLoading.value = false }
}

const saveSheet = async () => {
  if (!formData.value.name) { formError.value = 'Name is required'; return }
  // Filter out empty mappings
  const mapping = {}
  for (const [k, v] of Object.entries(columnMapping.value)) {
    if (v) mapping[k] = v
  }
  if (Object.keys(mapping).length === 0) { formError.value = 'Map at least one column'; return }

  formLoading.value = true; formError.value = null
  try {
    if (isEditing.value) {
      await updateGoogleSheet(editingSheet.value.id, {
        name: formData.value.name,
        column_mapping: mapping,
        source_label: formData.value.source_label || null,
        sync_interval_minutes: formData.value.sync_interval_minutes,
      })
    } else {
      await createGoogleSheet({
        name: formData.value.name,
        spreadsheet_url: formData.value.url,
        column_mapping: mapping,
        source_label: formData.value.source_label || null,
        sync_interval_minutes: formData.value.sync_interval_minutes,
      })
    }
    showForm.value = false
    await fetchSheets()
  } catch (err) {
    formError.value = err.response?.data?.detail || 'Failed to save'
  } finally { formLoading.value = false }
}

const handleSync = async (sheet) => {
  syncingId.value = sheet.id; syncResult.value = null
  try {
    const { data } = await syncGoogleSheet(sheet.id)
    syncResult.value = { id: sheet.id, ...data }
    await fetchSheets()
  } catch (err) {
    syncResult.value = { id: sheet.id, error: err.response?.data?.detail || 'Sync failed' }
  } finally { syncingId.value = null }
}

const handleReset = async (sheet) => {
  try {
    await resetGoogleSheetSync(sheet.id)
    await fetchSheets()
  } catch (err) {
    console.error('Reset failed:', err)
  }
}

const handleDelete = async (sheet) => {
  if (!confirm(`Delete "${sheet.name}"?`)) return
  try {
    await deleteGoogleSheet(sheet.id)
    await fetchSheets()
  } catch (err) {
    console.error('Delete failed:', err)
  }
}

const formatDate = (d) => {
  if (!d) return 'Never'
  return new Date(d).toLocaleString()
}

// Load sheets when switching to tab
const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'sheets' && sheets.value.length === 0) fetchSheets()
}
</script>

<template>
  <div class="import-page">
    <header class="page-header">
      <div class="header-content">
        <h1>Import Leads</h1>
        <p class="text-secondary">Import leads from Excel files or connect Google Sheets for auto-sync</p>
      </div>
    </header>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'excel' }" @click="switchTab('excel')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Excel Import
      </button>
      <button class="tab" :class="{ active: activeTab === 'sheets' }" @click="switchTab('sheets')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
        Google Sheets
      </button>
    </div>

    <!-- ==================== EXCEL TAB ==================== -->
    <div v-if="activeTab === 'excel'">
      <!-- Success Result -->
      <div v-if="result" class="result-card success">
        <div class="result-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2>Import Complete!</h2>
        <div class="result-stats">
          <div class="stat">
            <span class="stat-value success-text">{{ result.imported_count }}</span>
            <span class="stat-label">Leads Imported</span>
          </div>
          <div class="stat" v-if="result.skipped_count > 0">
            <span class="stat-value warning-text">{{ result.skipped_count }}</span>
            <span class="stat-label">Skipped</span>
          </div>
        </div>
        <div v-if="result.errors && result.errors.length > 0" class="errors-list">
          <h4>Errors:</h4>
          <ul><li v-for="(err, idx) in result.errors" :key="idx">{{ err }}</li></ul>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" @click="viewLeads">View Leads</button>
          <button class="btn btn-ghost" @click="importAnother">Import Another File</button>
        </div>
      </div>

      <template v-else>
        <div v-if="error" class="alert alert-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {{ error }}
          <button class="btn-close" @click="error = null">&times;</button>
        </div>

        <div class="import-container">
          <div class="upload-section">
            <div class="drop-zone" :class="{ 'drag-over': dragOver, 'has-file': file }"
              @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
              <template v-if="!file">
                <div class="drop-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p class="drop-text">Drag and drop your Excel file here</p>
                <p class="drop-subtext">or</p>
                <label class="btn btn-primary">
                  Browse Files
                  <input type="file" accept=".xlsx,.xls" @change="handleFileSelect" hidden />
                </label>
                <p class="file-hint">Supported formats: .xlsx, .xls</p>
              </template>
              <template v-else>
                <div class="file-preview">
                  <div class="file-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div class="file-info">
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                  </div>
                  <button class="btn-remove" @click="removeFile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </template>
            </div>

            <div class="form-group">
              <label>Lead Source (Optional)</label>
              <p class="form-hint">Assign a source to all imported leads that don't have one</p>
              <select v-model="source" class="form-select">
                <option value="">Auto-detect from file</option>
                <option v-for="src in sources" :key="src" :value="src">{{ src }}</option>
                <option value="custom">Custom source...</option>
              </select>
              <input v-if="source === 'custom'" type="text" v-model="customSource" class="form-input mt-2" placeholder="Enter custom source name" />
            </div>

            <button class="btn btn-primary btn-lg btn-block" @click="handleImport" :disabled="!file || loading">
              <template v-if="loading"><div class="spinner-sm"></div>Importing...</template>
              <template v-else>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Import Leads
              </template>
            </button>
          </div>

          <div class="column-reference">
            <h3>Expected Column Names</h3>
            <p class="text-secondary">The system will automatically map these columns from your Excel file</p>
            <div class="column-list">
              <div v-for="col in expectedColumns" :key="col.name" class="column-item">
                <span class="column-name">{{ col.name }}</span>
                <span class="column-desc">{{ col.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ==================== GOOGLE SHEETS TAB ==================== -->
    <div v-if="activeTab === 'sheets'">
      <div class="sheets-header">
        <div>
          <p class="text-secondary">Connect Google Sheets to automatically import new leads. Sheets must be shared as "Anyone with the link can view".</p>
        </div>
        <button class="btn btn-primary" @click="openAddForm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Sheet
        </button>
      </div>

      <!-- Sync Result Banner -->
      <div v-if="syncResult" class="alert" :class="syncResult.error ? 'alert-error' : 'alert-success'">
        <template v-if="syncResult.error">{{ syncResult.error }}</template>
        <template v-else>
          Synced: <strong>{{ syncResult.imported_count }}</strong> imported,
          <strong>{{ syncResult.skipped_count }}</strong> skipped
          ({{ syncResult.total_rows }} total rows)
        </template>
        <button class="btn-close" @click="syncResult = null">&times;</button>
      </div>

      <!-- Loading -->
      <div v-if="sheetsLoading" class="loading-box">
        <div class="spinner"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="sheets.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
        <h3>No Google Sheets connected</h3>
        <p>Add a Google Sheet to start importing leads automatically.</p>
        <button class="btn btn-primary" @click="openAddForm">Add Your First Sheet</button>
      </div>

      <!-- Sheets List -->
      <div v-else class="sheets-list">
        <div v-for="sheet in sheets" :key="sheet.id" class="sheet-card">
          <div class="sheet-info">
            <div class="sheet-name-row">
              <h4>{{ sheet.name }}</h4>
              <span class="badge" :class="sheet.is_active ? 'badge-success' : 'badge-muted'">
                {{ sheet.is_active ? 'Active' : 'Paused' }}
              </span>
            </div>
            <div class="sheet-meta">
              <span v-if="sheet.source_label" class="meta-item">Source: <strong>{{ sheet.source_label }}</strong></span>
              <span class="meta-item">Interval: <strong>{{ sheet.sync_interval_minutes }}m</strong></span>
              <span class="meta-item">Rows synced: <strong>{{ sheet.last_row_count }}</strong></span>
              <span class="meta-item">Last sync: <strong>{{ formatDate(sheet.last_synced_at) }}</strong></span>
            </div>
          </div>
          <div class="sheet-actions">
            <button class="btn btn-sm btn-primary" @click="handleSync(sheet)" :disabled="syncingId === sheet.id">
              <template v-if="syncingId === sheet.id"><div class="spinner-sm"></div></template>
              <template v-else>Sync Now</template>
            </button>
            <button class="btn btn-sm btn-ghost" @click="openEditForm(sheet)">Edit</button>
            <button class="btn btn-sm btn-ghost" @click="handleReset(sheet)" title="Reset sync counter to re-import all rows">Reset</button>
            <button class="btn btn-sm btn-danger-ghost" @click="handleDelete(sheet)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== ADD/EDIT SHEET MODAL ==================== -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ isEditing ? 'Edit Sheet' : 'Connect Google Sheet' }}</h3>
          <button class="modal-close" @click="showForm = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div v-if="formError" class="alert alert-error" style="margin: 16px 24px 0;">
          {{ formError }}
          <button class="btn-close" @click="formError = null">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Enter URL -->
          <div v-if="formStep === 1">
            <div class="form-group">
              <label>Google Sheet URL</label>
              <p class="form-hint">Paste the full URL of your Google Sheet. It must be shared as "Anyone with the link can view".</p>
              <input type="url" v-model="formData.url" class="form-input" placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>
            <button class="btn btn-primary" @click="fetchPreview" :disabled="formLoading || !formData.url">
              <template v-if="formLoading"><div class="spinner-sm"></div>Fetching...</template>
              <template v-else>Fetch Headers</template>
            </button>
          </div>

          <!-- Step 2: Configure Mapping -->
          <div v-if="formStep === 2">
            <div class="form-row">
              <div class="form-group form-group-half">
                <label>Sheet Name</label>
                <input type="text" v-model="formData.name" class="form-input" placeholder="e.g. Facebook Leads" />
              </div>
              <div class="form-group form-group-half">
                <label>Source Label</label>
                <input type="text" v-model="formData.source_label" class="form-input" placeholder="e.g. facebook" />
              </div>
            </div>

            <div class="form-group">
              <label>Sync Interval (minutes)</label>
              <select v-model="formData.sync_interval_minutes" class="form-select">
                <option :value="5">Every 5 minutes</option>
                <option :value="15">Every 15 minutes</option>
                <option :value="30">Every 30 minutes</option>
                <option :value="60">Every hour</option>
                <option :value="360">Every 6 hours</option>
                <option :value="1440">Every 24 hours</option>
              </select>
            </div>

            <div class="mapping-section">
              <h4>Column Mapping</h4>
              <p class="form-hint">Map each Google Sheet column to a lead field. Unmapped columns will be skipped.</p>

              <!-- Sample data preview -->
              <div v-if="previewSample.length > 0" class="preview-table-wrap">
                <table class="preview-table">
                  <thead>
                    <tr>
                      <th v-for="h in previewHeaders" :key="h">{{ h }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in previewSample" :key="i">
                      <td v-for="h in previewHeaders" :key="h">{{ row[h] || '' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mapping-grid">
                <div v-for="header in previewHeaders" :key="header" class="mapping-row">
                  <span class="mapping-header">{{ header }}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mapping-arrow">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                  <select v-model="columnMapping[header]" class="form-select mapping-select">
                    <option v-for="f in leadFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="formStep === 2" class="modal-footer">
          <button v-if="!isEditing" class="btn btn-ghost" @click="formStep = 1">Back</button>
          <button class="btn btn-primary" @click="saveSheet" :disabled="formLoading">
            <template v-if="formLoading"><div class="spinner-sm"></div>Saving...</template>
            <template v-else>{{ isEditing ? 'Update' : 'Save & Connect' }}</template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.import-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
.text-secondary { color: var(--text-secondary); }

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 28px;
  border-bottom: 2px solid var(--border-primary);
  padding-bottom: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab svg { width: 18px; height: 18px; }

.tab:hover { color: var(--text-primary); }
.tab.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

/* Alert */
.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  font-size: 0.875rem;
}
.alert svg { width: 20px; height: 20px; flex-shrink: 0; }
.alert-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
}
.alert-success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: var(--success);
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

/* Result Card */
.result-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: 48px; text-align: center; }
.result-card.success { border-color: rgba(34, 197, 94, 0.3); }
.result-icon { width: 72px; height: 72px; margin: 0 auto 24px; background: rgba(34, 197, 94, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.result-icon svg { width: 36px; height: 36px; color: var(--success); }
.result-card h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; }
.result-stats { display: flex; justify-content: center; gap: 48px; margin-bottom: 24px; }
.stat { display: flex; flex-direction: column; align-items: center; }
.stat-value { font-size: 2.5rem; font-weight: 700; }
.stat-label { color: var(--text-secondary); font-size: 0.875rem; }
.success-text { color: var(--success); }
.warning-text { color: var(--warning); }
.errors-list { text-align: left; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px; }
.errors-list h4 { color: var(--danger); margin-bottom: 8px; }
.errors-list ul { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 0.875rem; }
.result-actions { display: flex; justify-content: center; gap: 16px; }

/* Import Container */
.import-container { display: grid; grid-template-columns: 1fr 360px; gap: 32px; }

/* Upload Section */
.upload-section { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: 32px; }
.drop-zone { border: 2px dashed var(--border-primary); border-radius: var(--radius-lg); padding: 48px; text-align: center; transition: all 0.15s; margin-bottom: 24px; }
.drop-zone.drag-over { border-color: var(--accent-primary); background: var(--accent-muted); }
.drop-zone.has-file { border-style: solid; padding: 24px; }
.drop-icon { width: 64px; height: 64px; margin: 0 auto 16px; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.drop-icon svg { width: 28px; height: 28px; color: var(--text-secondary); }
.drop-text { font-size: 1.125rem; font-weight: 500; margin-bottom: 8px; }
.drop-subtext { color: var(--text-secondary); margin-bottom: 16px; }
.file-hint { margin-top: 16px; font-size: 0.8125rem; color: var(--text-muted); }

.file-preview { display: flex; align-items: center; gap: 16px; }
.file-icon { width: 48px; height: 48px; background: var(--accent-muted); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; }
.file-icon svg { width: 24px; height: 24px; color: var(--accent-primary); }
.file-info { flex: 1; text-align: left; }
.file-name { display: block; font-weight: 500; margin-bottom: 4px; }
.file-size { font-size: 0.8125rem; color: var(--text-secondary); }
.btn-remove { width: 36px; height: 36px; padding: 0; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.btn-remove:hover { background: rgba(239, 68, 68, 0.15); border-color: var(--danger); color: var(--danger); }
.btn-remove svg { width: 18px; height: 18px; }

/* Form */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.875rem; }
.form-hint { color: var(--text-secondary); font-size: 0.8125rem; margin-bottom: 10px; }
.form-select, .form-input { width: 100%; padding: 10px 14px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.9375rem; }
.form-select:focus, .form-input:focus { outline: none; border-color: var(--accent-primary); }
.form-row { display: flex; gap: 16px; }
.form-group-half { flex: 1; }
.mt-2 { margin-top: 8px; }

/* Column Reference */
.column-reference { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: 24px; height: fit-content; }
.column-reference h3 { font-size: 1rem; font-weight: 600; margin-bottom: 4px; }
.column-reference > .text-secondary { font-size: 0.8125rem; margin-bottom: 16px; }
.column-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.column-item { display: flex; flex-direction: column; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); }
.column-name { font-family: 'JetBrains Mono', monospace; font-size: 0.8125rem; color: var(--accent-primary); margin-bottom: 2px; }
.column-desc { font-size: 0.75rem; color: var(--text-secondary); }

/* ==================== Google Sheets Styles ==================== */
.sheets-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }

.loading-box { display: flex; justify-content: center; padding: 48px; }

.empty-state {
  text-align: center;
  padding: 64px 32px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
}
.empty-state svg { width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 16px; }
.empty-state h3 { margin-bottom: 8px; }
.empty-state p { color: var(--text-secondary); margin-bottom: 24px; }

/* Sheet Cards */
.sheets-list { display: flex; flex-direction: column; gap: 12px; }
.sheet-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
}
.sheet-info { flex: 1; min-width: 0; }
.sheet-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.sheet-name-row h4 { margin: 0; font-size: 1rem; }
.badge { padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge-success { background: rgba(34, 197, 94, 0.15); color: var(--success); }
.badge-muted { background: var(--bg-tertiary); color: var(--text-muted); }
.sheet-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.8125rem; color: var(--text-secondary); }
.meta-item strong { color: var(--text-primary); }
.sheet-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}
.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.modal-lg { max-width: 700px; }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-secondary);
}
.modal-header h3 { margin: 0; font-size: 1.125rem; }
.modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
.modal-close svg { width: 20px; height: 20px; }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-secondary);
}

/* Mapping */
.mapping-section { margin-top: 24px; }
.mapping-section h4 { margin-bottom: 4px; }
.mapping-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.mapping-row { display: flex; align-items: center; gap: 12px; }
.mapping-header {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mapping-arrow { width: 20px; height: 20px; color: var(--text-muted); flex-shrink: 0; }
.mapping-select { flex: 1; }

/* Preview Table */
.preview-table-wrap { overflow-x: auto; margin-bottom: 16px; border: 1px solid var(--border-secondary); border-radius: var(--radius-md); }
.preview-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.preview-table th {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
  border-bottom: 1px solid var(--border-secondary);
}
.preview-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-secondary);
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; border-radius: var(--radius-md); font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.15s; border: none; }
.btn svg { width: 18px; height: 18px; }
.btn-primary { background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover)); color: #000; }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-primary); }
.btn-ghost:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-danger-ghost { background: transparent; color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }
.btn-danger-ghost:hover { background: rgba(239, 68, 68, 0.1); }
.btn-sm { padding: 6px 14px; font-size: 0.8125rem; }
.btn-lg { padding: 14px 24px; font-size: 1rem; }
.btn-block { width: 100%; }

.spinner { width: 32px; height: 32px; border: 3px solid var(--border-primary); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite; }
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(0, 0, 0, 0.2); border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .import-container { grid-template-columns: 1fr; }
  .sheet-card { flex-direction: column; align-items: flex-start; }
  .sheet-actions { width: 100%; }
  .form-row { flex-direction: column; gap: 0; }
}
</style>
