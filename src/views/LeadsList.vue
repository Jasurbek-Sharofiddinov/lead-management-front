<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  getLeads,
  getStatusOptions,
  getSourceOptions,
  getMonthOptions,
  getAssigneeOptions,
  createLead,
  getStatuses
} from '../services/api'

const router = useRouter()

const leads = ref([])
const loading = ref(true)
const total = ref(0)
const totalPages = ref(0)

// Filters
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const statusFilter = ref('')
const sourceFilter = ref('')
const monthFilter = ref('')
const assigneeFilter = ref('')
const sortBy = ref('created_at')
const sortOrder = ref('desc')

// Filter options
const statusOptions = ref([])
const sourceOptions = ref([])
const monthOptions = ref([])
const assigneeOptions = ref([])

// Status list with colors
const statusesList = ref([])

// Modal
const showAddModal = ref(false)
const newLead = ref({
  name: '',
  company: '',
  phone: '',
  email: '',
  dot_number: '',
  number_of_trucks: '',
  status: 'new',
  source: '',
  notes: ''
})
const saving = ref(false)

const fetchLeads = async () => {
  try {
    loading.value = true
    const params = {
      page: page.value,
      page_size: pageSize.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    }

    if (search.value) params.search = search.value
    if (statusFilter.value) params.status = statusFilter.value
    if (sourceFilter.value) params.source = sourceFilter.value
    if (monthFilter.value) params.source_month = monthFilter.value
    if (assigneeFilter.value) params.assigned_to = assigneeFilter.value

    const { data } = await getLeads(params)
    leads.value = data.leads
    total.value = data.total
    totalPages.value = data.total_pages
  } catch (err) {
    console.error('Failed to fetch leads:', err)
  } finally {
    loading.value = false
  }
}

const fetchFilterOptions = async () => {
  try {
    const [statuses, sources, months, assignees] = await Promise.all([
      getStatusOptions(),
      getSourceOptions(),
      getMonthOptions(),
      getAssigneeOptions()
    ])
    statusOptions.value = statuses.data
    sourceOptions.value = sources.data
    monthOptions.value = months.data
    assigneeOptions.value = assignees.data
  } catch (err) {
    console.error('Failed to fetch filter options:', err)
  }
}

const fetchStatuses = async () => {
  try {
    const { data } = await getStatuses()
    statusesList.value = data
  } catch (err) {
    console.error('Failed to fetch statuses:', err)
  }
}

const getStatusColor = (statusName) => {
  const status = statusesList.value.find(s => s.name === statusName)
  return status?.color || '#6b7280'
}

const handleSearch = () => {
  page.value = 1
  fetchLeads()
}

const clearFilters = () => {
  search.value = ''
  statusFilter.value = ''
  sourceFilter.value = ''
  monthFilter.value = ''
  assigneeFilter.value = ''
  page.value = 1
  fetchLeads()
}

const goToLead = (id) => {
  router.push(`/leads/${id}`)
}

const changePage = (newPage) => {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage
    fetchLeads()
  }
}

const handleSort = (column) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortOrder.value = 'desc'
  }
  fetchLeads()
}

const saveNewLead = async () => {
  try {
    saving.value = true
    const { data } = await createLead(newLead.value)
    showAddModal.value = false
    newLead.value = {
      name: '',
      company: '',
      phone: '',
      email: '',
      dot_number: '',
      number_of_trucks: '',
      status: 'new',
      source: '',
      notes: ''
    }
    router.push(`/leads/${data.id}`)
  } catch (err) {
    console.error('Failed to create lead:', err)
  } finally {
    saving.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

const paginationPages = computed(() => {
  const pages = []
  const current = page.value
  const total = totalPages.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total)
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }
  }
  return pages
})

watch([statusFilter, sourceFilter, monthFilter, assigneeFilter], () => {
  page.value = 1
  fetchLeads()
})

onMounted(() => {
  fetchLeads()
  fetchFilterOptions()
  fetchStatuses()
})
</script>

<template>
  <div class="leads-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2>Leads</h2>
        <span class="lead-count">{{ total }} total</span>
      </div>
      <button class="btn btn-primary" @click="showAddModal = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Lead
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          v-model="search"
          placeholder="Search by name, company, phone, email, DOT..."
          @keyup.enter="handleSearch"
        />
      </div>

      <div class="filter-group">
        <select v-model="statusFilter">
          <option value="">All Statuses</option>
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ status }}
          </option>
        </select>

        <select v-model="sourceFilter">
          <option value="">All Sources</option>
          <option v-for="source in sourceOptions" :key="source" :value="source">
            {{ source }}
          </option>
        </select>

        <select v-model="monthFilter">
          <option value="">All Months</option>
          <option v-for="month in monthOptions" :key="month" :value="month">
            {{ month }}
          </option>
        </select>

        <select v-model="assigneeFilter">
          <option value="">All Assignees</option>
          <option v-for="assignee in assigneeOptions" :key="assignee" :value="assignee">
            {{ assignee }}
          </option>
        </select>

        <button class="btn btn-ghost btn-sm" @click="clearFilters">
          Clear
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container card">
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
      </div>

      <table>
        <thead>
          <tr>
            <th @click="handleSort('name')" class="sortable">
              Name
              <span v-if="sortBy === 'name'" class="sort-icon">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th @click="handleSort('company')" class="sortable">
              Company
              <span v-if="sortBy === 'company'" class="sort-icon">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th>Phone</th>
            <th>DOT</th>
            <th>Trucks</th>
            <th @click="handleSort('status')" class="sortable">
              Status
              <span v-if="sortBy === 'status'" class="sort-icon">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th @click="handleSort('source')" class="sortable">
              Source
              <span v-if="sortBy === 'source'" class="sort-icon">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th @click="handleSort('source_month')" class="sortable">
              Month
              <span v-if="sortBy === 'source_month'" class="sort-icon">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th @click="handleSort('created_at')" class="sortable">
              Created
              <span v-if="sortBy === 'created_at'" class="sort-icon">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="lead in leads"
            :key="lead.id"
            @click="goToLead(lead.id)"
            class="lead-row"
          >
            <td>
              <div class="lead-name">{{ lead.name || '-' }}</div>
            </td>
            <td>{{ lead.company || '-' }}</td>
            <td class="font-mono">{{ lead.phone || '-' }}</td>
            <td class="font-mono">{{ lead.dot_number || '-' }}</td>
            <td>{{ lead.number_of_trucks || '-' }}</td>
            <td>
              <span class="badge" :style="{ backgroundColor: getStatusColor(lead.status) + '20', color: getStatusColor(lead.status), borderColor: getStatusColor(lead.status) + '40' }">{{ lead.status || 'unknown' }}</span>
            </td>
            <td>{{ lead.source || '-' }}</td>
            <td>{{ lead.source_month || '-' }}</td>
            <td class="text-muted">{{ formatDate(lead.created_at) }}</td>
          </tr>
          <tr v-if="!loading && leads.length === 0">
            <td colspan="9" class="empty-cell">
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                <p>No leads found</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-container" v-if="totalPages > 1">
      <div class="pagination-info">
        Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, total) }} of {{ total }}
      </div>
      <div class="pagination">
        <button @click="changePage(page - 1)" :disabled="page === 1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <template v-for="p in paginationPages" :key="p">
          <span v-if="p === '...'" class="pagination-ellipsis">...</span>
          <button
            v-else
            @click="changePage(p)"
            :class="{ active: p === page }"
          >
            {{ p }}
          </button>
        </template>

        <button @click="changePage(page + 1)" :disabled="page === totalPages">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Add Lead Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Add New Lead</h3>
          <button class="modal-close" @click="showAddModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveNewLead" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>Name</label>
              <input type="text" v-model="newLead.name" placeholder="Full name" />
            </div>
            <div class="form-group">
              <label>Company</label>
              <input type="text" v-model="newLead.company" placeholder="Company name" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Phone</label>
              <input type="text" v-model="newLead.phone" placeholder="Phone number" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" v-model="newLead.email" placeholder="Email address" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>DOT Number</label>
              <input type="text" v-model="newLead.dot_number" placeholder="DOT number" />
            </div>
            <div class="form-group">
              <label>Number of Trucks</label>
              <input type="text" v-model="newLead.number_of_trucks" placeholder="e.g., 5" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select v-model="newLead.status">
                <option v-for="status in statusesList" :key="status.name" :value="status.name">
                  {{ status.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Source</label>
              <select v-model="newLead.source">
                <option value="">Select source</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="form">Form</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="newLead.notes" placeholder="Add any notes..." rows="3"></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Create Lead' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leads-page {
  animation: fadeIn 0.3s ease;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
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

.btn svg {
  width: 18px;
  height: 18px;
}

/* Filters */
.filters-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 300px;
  position: relative;
}

.search-box svg {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.search-box input {
  padding-left: 48px;
}

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-group select {
  width: auto;
  min-width: 140px;
}

/* Table */
.table-container {
  position: relative;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(13, 17, 23, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

table {
  min-width: 100%;
}

th.sortable {
  cursor: pointer;
  user-select: none;
}

th.sortable:hover {
  color: var(--text-secondary);
}

.sort-icon {
  margin-left: 4px;
  color: var(--accent-primary);
}

.lead-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.lead-row:hover td {
  background: var(--bg-tertiary);
}

.lead-name {
  font-weight: 500;
  color: var(--text-primary);
}

.empty-cell {
  padding: 60px !important;
}

/* Pagination */
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
}

.pagination-info {
  font-size: 14px;
  color: var(--text-muted);
}

.pagination svg {
  width: 16px;
  height: 16px;
}

.pagination-ellipsis {
  padding: 0 8px;
  color: var(--text-muted);
}

/* Modal Form */
.modal-form {
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 100%;
  }

  .filter-group {
    flex-wrap: wrap;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
