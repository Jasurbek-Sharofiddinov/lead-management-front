<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { importExcel, getSourceOptions } from '../services/api'

const router = useRouter()

const file = ref(null)
const source = ref('')
const sources = ref([])
const customSource = ref('')
const loading = ref(false)
const dragOver = ref(false)
const result = ref(null)
const error = ref(null)

const expectedColumns = [
  { name: 'name', description: 'Lead name or contact name', required: false },
  { name: 'company', description: 'Company or business name', required: false },
  { name: 'phone', description: 'Phone number', required: false },
  { name: 'email', description: 'Email address', required: false },
  { name: 'dot', description: 'DOT number', required: false },
  { name: 'number_of_trucks', description: 'Fleet size', required: false },
  { name: 'has_accounting', description: 'Do they have accounting?', required: false },
  { name: 'source', description: 'Lead source (facebook, instagram, etc.)', required: false },
  { name: 'notes', description: 'Additional notes', required: false },
  { name: 'status', description: 'Lead status (defaults to "new")', required: false },
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

const handleDragOver = (e) => {
  e.preventDefault()
  dragOver.value = true
}

const handleDragLeave = () => {
  dragOver.value = false
}

const handleDrop = (e) => {
  e.preventDefault()
  dragOver.value = false
  const droppedFile = e.dataTransfer.files[0]
  if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
    file.value = droppedFile
    error.value = null
  } else {
    error.value = 'Please upload an Excel file (.xlsx or .xls)'
  }
}

const handleFileSelect = (e) => {
  const selectedFile = e.target.files[0]
  if (selectedFile) {
    file.value = selectedFile
    error.value = null
  }
}

const removeFile = () => {
  file.value = null
  result.value = null
}

const handleImport = async () => {
  if (!file.value) {
    error.value = 'Please select a file to import'
    return
  }

  loading.value = true
  error.value = null
  result.value = null

  try {
    const selectedSource = source.value === 'custom' ? customSource.value : source.value
    const { data } = await importExcel(file.value, selectedSource || null)
    result.value = data
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to import file'
  } finally {
    loading.value = false
  }
}

const viewLeads = () => {
  router.push('/leads')
}

const importAnother = () => {
  file.value = null
  result.value = null
  error.value = null
  source.value = ''
  customSource.value = ''
}
</script>

<template>
  <div class="import-page">
    <header class="page-header">
      <div class="header-content">
        <h1>Import Leads</h1>
        <p class="text-secondary">Upload an Excel file to import leads into the system</p>
      </div>
    </header>

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
        <ul>
          <li v-for="(err, idx) in result.errors" :key="idx">{{ err }}</li>
        </ul>
      </div>
      <div class="result-actions">
        <button class="btn btn-primary" @click="viewLeads">View Leads</button>
        <button class="btn btn-ghost" @click="importAnother">Import Another File</button>
      </div>
    </div>

    <!-- Import Form -->
    <template v-else>
      <!-- Error Message -->
      <div v-if="error" class="alert alert-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        {{ error }}
        <button class="btn-close" @click="error = null">&times;</button>
      </div>

      <div class="import-container">
        <!-- Upload Section -->
        <div class="upload-section">
          <div
            class="drop-zone"
            :class="{ 'drag-over': dragOver, 'has-file': file }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <template v-if="!file">
              <div class="drop-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p class="drop-text">Drag and drop your Excel file here</p>
              <p class="drop-subtext">or</p>
              <label class="btn btn-primary">
                Browse Files
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  @change="handleFileSelect"
                  hidden
                />
              </label>
              <p class="file-hint">Supported formats: .xlsx, .xls</p>
            </template>

            <template v-else>
              <div class="file-preview">
                <div class="file-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div class="file-info">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                </div>
                <button class="btn-remove" @click="removeFile" title="Remove file">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>

          <!-- Source Selection -->
          <div class="form-group">
            <label>Lead Source (Optional)</label>
            <p class="form-hint">Assign a source to all imported leads that don't have one</p>
            <select v-model="source" class="form-select">
              <option value="">Auto-detect from file</option>
              <option v-for="src in sources" :key="src" :value="src">{{ src }}</option>
              <option value="custom">Custom source...</option>
            </select>
            <input
              v-if="source === 'custom'"
              type="text"
              v-model="customSource"
              class="form-input mt-2"
              placeholder="Enter custom source name"
            />
          </div>

          <!-- Import Button -->
          <button
            class="btn btn-primary btn-lg btn-block"
            @click="handleImport"
            :disabled="!file || loading"
          >
            <template v-if="loading">
              <div class="spinner-sm"></div>
              Importing...
            </template>
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Import Leads
            </template>
          </button>
        </div>

        <!-- Column Reference -->
        <div class="column-reference">
          <h3>Expected Column Names</h3>
          <p class="text-secondary">The system will automatically map these columns from your Excel file</p>
          <div class="column-list">
            <div v-for="col in expectedColumns" :key="col.name" class="column-item">
              <span class="column-name">{{ col.name }}</span>
              <span class="column-desc">{{ col.description }}</span>
            </div>
          </div>
          <div class="column-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <p>At least one of <strong>name</strong> or <strong>company</strong> must have a value for each row.</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.import-page {
  max-width: 1100px;
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

/* Alert */
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

/* Result Card */
.result-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 48px;
  text-align: center;
}

.result-card.success {
  border-color: rgba(34, 197, 94, 0.3);
}

.result-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 24px;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon svg {
  width: 36px;
  height: 36px;
  color: var(--success);
}

.result-card h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 24px;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-bottom: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.success-text {
  color: var(--success);
}

.warning-text {
  color: var(--warning);
}

.errors-list {
  text-align: left;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 24px;
}

.errors-list h4 {
  color: var(--danger);
  margin-bottom: 8px;
}

.errors-list ul {
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* Import Container */
.import-container {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 32px;
}

/* Upload Section */
.upload-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 32px;
}

.drop-zone {
  border: 2px dashed var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 48px;
  text-align: center;
  transition: all var(--transition-fast);
  margin-bottom: 24px;
}

.drop-zone.drag-over {
  border-color: var(--accent-primary);
  background: var(--accent-muted);
}

.drop-zone.has-file {
  border-style: solid;
  padding: 24px;
}

.drop-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--bg-tertiary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-icon svg {
  width: 28px;
  height: 28px;
  color: var(--text-secondary);
}

.drop-text {
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.drop-subtext {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.file-hint {
  margin-top: 16px;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* File Preview */
.file-preview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.file-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-muted);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-icon svg {
  width: 24px;
  height: 24px;
  color: var(--accent-primary);
}

.file-info {
  flex: 1;
  text-align: left;
}

.file-name {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

.file-size {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.btn-remove {
  width: 36px;
  height: 36px;
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

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--danger);
  color: var(--danger);
}

.btn-remove svg {
  width: 18px;
  height: 18px;
}

/* Form */
.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

.form-hint {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  margin-bottom: 12px;
}

.form-select,
.form-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.mt-2 {
  margin-top: 8px;
}

/* Column Reference */
.column-reference {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
  height: fit-content;
}

.column-reference h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.column-reference > .text-secondary {
  font-size: 0.8125rem;
  margin-bottom: 16px;
}

.column-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.column-item {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.column-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: var(--accent-primary);
  margin-bottom: 2px;
}

.column-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.column-note {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.column-note svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--info);
}

.column-note p {
  margin: 0;
}

.column-note strong {
  color: var(--text-primary);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.btn-lg {
  padding: 14px 24px;
  font-size: 1rem;
}

.btn-block {
  width: 100%;
}

.spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 900px) {
  .import-container {
    grid-template-columns: 1fr;
  }
}
</style>
