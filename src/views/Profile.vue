<script setup>
import { ref, onMounted } from 'vue'
import { getCurrentUser, updateProfile, changePassword } from '../services/api'

const user = ref(null)
const loading = ref(true)
const error = ref(null)
const successMessage = ref(null)

// Profile form
const profileForm = ref({
  email: '',
  full_name: ''
})
const profileSaving = ref(false)

// Password form
const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: ''
})
const passwordSaving = ref(false)
const showPasswords = ref(false)

const fetchUser = async () => {
  try {
    loading.value = true
    const { data } = await getCurrentUser()
    user.value = data
    profileForm.value = {
      email: data.email || '',
      full_name: data.full_name || ''
    }
  } catch (err) {
    error.value = 'Failed to load profile'
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

const clearError = () => {
  error.value = null
}

const handleUpdateProfile = async () => {
  try {
    profileSaving.value = true
    error.value = null
    const { data } = await updateProfile(profileForm.value)
    user.value = data

    // Update localStorage
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    localStorage.setItem('user', JSON.stringify({ ...storedUser, ...data }))

    showSuccess('Profile updated successfully')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to update profile'
  } finally {
    profileSaving.value = false
  }
}

const handleChangePassword = async () => {
  // Validation
  if (!passwordForm.value.current_password) {
    error.value = 'Current password is required'
    return
  }
  if (!passwordForm.value.new_password) {
    error.value = 'New password is required'
    return
  }
  if (passwordForm.value.new_password.length < 6) {
    error.value = 'New password must be at least 6 characters'
    return
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    error.value = 'New passwords do not match'
    return
  }

  try {
    passwordSaving.value = true
    error.value = null
    await changePassword({
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password
    })

    // Clear form
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }

    showSuccess('Password changed successfully')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to change password'
  } finally {
    passwordSaving.value = false
  }
}

onMounted(fetchUser)
</script>

<template>
  <div class="profile-page">
    <header class="page-header">
      <div class="header-content">
        <h1>Profile Settings</h1>
        <p class="text-secondary">Manage your account settings and change your password</p>
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

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading profile...</span>
    </div>

    <div v-else class="profile-sections">
      <!-- Profile Information -->
      <section class="profile-section">
        <div class="section-header">
          <div>
            <h2>Profile Information</h2>
            <p class="text-secondary">Update your account details</p>
          </div>
        </div>

        <form @submit.prevent="handleUpdateProfile" class="profile-form">
          <div class="form-group">
            <label>Username</label>
            <input
              type="text"
              :value="user?.username"
              class="form-input"
              disabled
            />
            <span class="form-hint">Username cannot be changed</span>
          </div>

          <div class="form-group">
            <label>Email</label>
            <input
              type="email"
              v-model="profileForm.email"
              class="form-input"
              placeholder="your@email.com"
            />
          </div>

          <div class="form-group">
            <label>Full Name</label>
            <input
              type="text"
              v-model="profileForm.full_name"
              class="form-input"
              placeholder="Your full name"
            />
          </div>

          <div class="form-group">
            <label>Role</label>
            <input
              type="text"
              :value="user?.role"
              class="form-input"
              disabled
            />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="profileSaving">
              <span v-if="profileSaving">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </form>
      </section>

      <!-- Change Password -->
      <section class="profile-section">
        <div class="section-header">
          <div>
            <h2>Change Password</h2>
            <p class="text-secondary">Update your password to keep your account secure</p>
          </div>
        </div>

        <form @submit.prevent="handleChangePassword" class="profile-form">
          <div class="form-group">
            <label>Current Password</label>
            <div class="password-input">
              <input
                :type="showPasswords ? 'text' : 'password'"
                v-model="passwordForm.current_password"
                class="form-input"
                placeholder="Enter current password"
              />
            </div>
          </div>

          <div class="form-group">
            <label>New Password</label>
            <div class="password-input">
              <input
                :type="showPasswords ? 'text' : 'password'"
                v-model="passwordForm.new_password"
                class="form-input"
                placeholder="Enter new password"
              />
            </div>
            <span class="form-hint">Minimum 6 characters</span>
          </div>

          <div class="form-group">
            <label>Confirm New Password</label>
            <div class="password-input">
              <input
                :type="showPasswords ? 'text' : 'password'"
                v-model="passwordForm.confirm_password"
                class="form-input"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="showPasswords" />
              Show passwords
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="passwordSaving">
              <span v-if="passwordSaving">Changing...</span>
              <span v-else>Change Password</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 800px;
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

/* Profile Sections */
.profile-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
}

/* Form */
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 12px 14px;
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

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.password-input {
  position: relative;
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

.form-actions {
  padding-top: 8px;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
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
</style>
