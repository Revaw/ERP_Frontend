<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Gestion des Utilisateurs</h1>
        <p class="page__subtitle">Comptes et permissions d'accès</p>
      </div>
      <ButtonBack />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <label class="toggle-inactive">
        <input type="checkbox" v-model="showInactive" @change="loadUsers" />
        <span>Afficher les comptes désactivés</span>
      </label>
      <button class="btn-primary" @click="openAddModal">
        <FontAwesomeIcon :icon="['fas', 'user-plus']" />
        Nouvel Utilisateur
      </button>
    </div>

    <!-- Tableau des utilisateurs -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Rôle</th>
            <th>Tenant</th>
            <th>Statut</th>
            <th>Créé le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user._id">
            <td data-label="Utilisateur">
              <div class="user-info">
                <FontAwesomeIcon :icon="['fas', 'user']" class="user-info__icon" />
                <span class="user-info__name">{{ user.username }}</span>
              </div>
            </td>
            <td data-label="Rôle">
              <span :class="['role-badge', `role-badge--${user.role}`]">
                <FontAwesomeIcon :icon="getRoleIcon(user.role)" />
                {{ formatRole(user.role) }}
              </span>
            </td>
            <td data-label="Tenant">
              <span v-if="user.tenantId" class="tenant-badge">{{ user.tenantId }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td data-label="Statut">
              <span :class="['status-badge', user.isActive === false ? 'status-badge--inactive' : 'status-badge--active']">
                {{ user.isActive === false ? 'Désactivé' : 'Actif' }}
              </span>
            </td>
            <td data-label="Créé le">{{ formatDate(user.createdAt) }}</td>
            <td data-label="Actions" class="actions-cell">
              <button class="btn-secondary btn--sm" @click="openEditModal(user)" :disabled="user.isActive === false">
                <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
                Modifier
              </button>
              <button
                v-if="user.isActive !== false"
                class="btn-icon btn-icon--danger"
                @click="prepareDeactivate(user)"
                :disabled="user.username === 'admin'"
                title="Désactiver"
              >
                <FontAwesomeIcon :icon="['fas', 'ban']" />
              </button>
              <button
                v-else
                class="btn-icon btn-icon--success"
                @click="confirmReactivate(user)"
                title="Réactiver"
              >
                <FontAwesomeIcon :icon="['fas', 'rotate-right']" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal création/modification -->
    <Modal
      :isOpen="isModalOpen"
      :title="isEditing ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'"
      @close="closeModal"
    >
      <form @submit.prevent="saveForm" class="modal-form">
        <div class="form-group">
          <label for="username">Nom d'utilisateur</label>
          <input
            id="username"
            type="text"
            v-model="form.username"
            required
            :disabled="isEditing"
            placeholder="Ex: atelier_1"
          />
          <small v-if="isEditing" class="form-hint">
            L'identifiant ne peut pas être modifié.
          </small>
        </div>

        <div class="form-group">
          <label for="password">
            {{
              isEditing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'
            }}
          </label>
          <input
            id="password"
            type="password"
            v-model="form.password"
            :required="!isEditing"
            placeholder="******"
            minlength="6"
          />
          <ul v-if="form.password || !isEditing" class="password-rules">
            <li :class="{ valid: pwdHasMinLength }">Au moins 6 caractères</li>
            <li :class="{ valid: pwdHasUppercase }">Une majuscule</li>
            <li :class="{ valid: pwdHasSpecialChar }">Un caractère spécial</li>
          </ul>
        </div>

        <div class="form-group">
          <label for="role">Rôle</label>
          <select id="role" v-model="form.role" required>
            <option value="user">Utilisateur (Production/Lecture)</option>
            <option value="moderator">Modérateur (Stocks/BOM)</option>
            <option value="superadmin">Super Admin</option>
            <option value="external_provider">Prestataire Externe</option>
          </select>
        </div>

        <div class="form-group">
          <label for="tenantId">Tenant ID <small class="form-hint-inline">(ex: monabee — laisser vide pour les ERP users)</small></label>
          <input
            id="tenantId"
            type="text"
            v-model="form.tenantId"
            placeholder="Ex: monabee"
          />
        </div>

        <div class="form-group" v-if="isEditing">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.isPasswordTemporary" />
            <span>Forcer le changement de mot de passe à la prochaine connexion</span>
          </label>
        </div>
      </form>

      <template #footer>
        <button class="btn-secondary" @click="closeModal">Annuler</button>
        <button class="btn-primary" @click="saveForm">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          {{ isEditing ? 'Enregistrer' : 'Créer' }}
        </button>
      </template>
    </Modal>
    <!-- Modal désactivation -->
    <Modal
      :isOpen="isConfirmModalOpen"
      title="Désactiver le compte"
      @close="isConfirmModalOpen = false"
    >
      <p v-if="userToDeactivate">
        Voulez-vous désactiver le compte de
        <strong>{{ userToDeactivate.username }}</strong> ?
      </p>
      <p class="text-muted mt-2">
        Le compte sera conservé mais l'utilisateur ne pourra plus se connecter.
        Vous pourrez le réactiver à tout moment.
      </p>

      <template #footer>
        <button class="btn-secondary" @click="isConfirmModalOpen = false">Annuler</button>
        <button class="btn-danger" @click="confirmDeactivate">
          <FontAwesomeIcon :icon="['fas', 'ban']" />
          Désactiver le compte
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
//store
import { useToastStore } from '@/stores/toast'
// --- SERVICES ---
import { getAllUsers, createUser, updateUser, deactivateUser, reactivateUser } from '@/services/users.js'
// --- UTILS ---
import { formatDate } from '@/utils/formatDate.js'
// --- COMPOSANTS UI ---
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Modal from '@/components/ui/Modal.vue'

const toast = useToastStore()

// --- ETAT ---
const users = ref([])
const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({
  _id: null,
  username: '',
  password: '',
  role: 'user',
  tenantId: '',
  isPasswordTemporary: true, // Force le changement de mot de passe à la prochaine connexion
})

// --- État pour la confirmation de désactivation ---
const showInactive = ref(false)
const isConfirmModalOpen = ref(false)
const userToDeactivate = ref(null)

const prepareDeactivate = (user) => {
  userToDeactivate.value = user
  isConfirmModalOpen.value = true
}

const confirmDeactivate = async () => {
  if (!userToDeactivate.value) return
  try {
    await deactivateUser(userToDeactivate.value._id)
    await loadUsers()
    toast.success('Compte désactivé')
  } catch {
    toast.error('Erreur désactivation')
  } finally {
    isConfirmModalOpen.value = false
    userToDeactivate.value = null
  }
}

const confirmReactivate = async (user) => {
  try {
    await reactivateUser(user._id)
    await loadUsers()
    toast.success('Compte réactivé')
  } catch {
    toast.error('Erreur réactivation')
  }
}

// --- VALIDATION MOT DE PASSE ---
const pwdHasMinLength = computed(() => form.value.password.length >= 6)
const pwdHasUppercase = computed(() => /[A-Z]/.test(form.value.password))
const pwdHasSpecialChar = computed(() => /[!@#$%^&*(),.?:{}|<>]/.test(form.value.password))

// --- HELPERS ---
const formatRole = (role) => {
  const roles = {
    user: 'Utilisateur',
    moderator: 'Modérateur',
    superadmin: 'Super Admin',
    external_provider: 'Prestataire',
  }
  return roles[role] || role
}

const getRoleIcon = (role) => {
  const icons = {
    user: ['fas', 'user'],
    moderator: ['fas', 'user-gear'],
    superadmin: ['fas', 'user-shield'],
    external_provider: ['fas', 'truck-fast'],
  }
  return icons[role] || ['fas', 'user']
}

// --- ACTIONS UI ---
const loadUsers = async () => {
  try {
    users.value = await getAllUsers({ includeInactive: showInactive.value })
  } catch {
    toast.error('Erreur chargement utilisateurs')
  }
}

const openAddModal = () => {
  isEditing.value = false
  form.value = { _id: null, username: '', password: '', role: 'user', tenantId: '', isPasswordTemporary: true }
  isModalOpen.value = true
}

const openEditModal = (user) => {
  isEditing.value = true
  // On clone pour éviter la modif en direct
  form.value = {
    _id: user._id,
    username: user.username,
    password: '',
    role: user.role,
    tenantId: user.tenantId || '',
    isPasswordTemporary: user.isPasswordTemporary,
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

// --- LOGIQUE METIER ---
const isPasswordValid = (pwd) => {
  if (pwd.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (!/[A-Z]/.test(pwd)) return 'Le mot de passe doit contenir au moins une majuscule.'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd))
    return 'Le mot de passe doit contenir au moins un caractère spécial.'
  return null
}

const saveForm = async () => {
  // Validation mot de passe si requis
  if (form.value.password) {
    const pwdError = isPasswordValid(form.value.password)
    if (pwdError) {
      toast.error(pwdError)
      return
    }
  } else if (!isEditing.value) {
    toast.error('Le mot de passe est requis.')
    return
  }

  try {
    if (isEditing.value) {
      const payload = {
        role: form.value.role,
        tenantId: form.value.tenantId || null,
        isPasswordTemporary: form.value.isPasswordTemporary,
      }
      // Si un MDP est saisi, on l'ajoute au payload
      if (form.value.password) {
        payload.password = form.value.password
      }
      await updateUser(form.value._id, payload)
      toast.success('Utilisateur modifié')
    } else {
      await createUser(form.value)
      toast.success('Utilisateur créé')
    }
    closeModal()
    await loadUsers()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur sauvegarde')
  }
}

onMounted(loadUsers)
</script>

<style lang="scss" scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: $spacing-6;
  animation: fadeIn $transition-base ease-out;

  @media (max-width: $breakpoint-sm) {
    padding: $spacing-4;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $spacing-4;
    margin-bottom: $spacing-6;

    @media (max-width: $breakpoint-sm) {
      flex-direction: column;
    }
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: var(--text-primary);
    margin: 0;
  }

  &__subtitle {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    margin: $spacing-1 0 0 0;
  }
}

// Toolbar
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-5;
}

// Table
.table-wrapper {
  @include card;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: $spacing-3 $spacing-4;
    text-align: left;
    border-bottom: 1px solid var(--border-light);
  }

  th {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
  }

  td {
    font-size: $font-size-sm;
    color: var(--text-primary);
  }

  tbody tr {
    transition: background-color $transition-fast;

    &:hover {
      background-color: var(--bg-secondary);
    }
  }
}

// User info
.user-info {
  display: flex;
  align-items: center;
  gap: $spacing-2;

  &__icon {
    color: var(--text-tertiary);
    font-size: $font-size-sm;
  }

  &__name {
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }
}

// Role badges
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;

  &--superadmin {
    background-color: var(--color-error-bg);
    color: var(--color-error);
  }

  &--moderator {
    background-color: var(--color-warning-bg);
    color: var(--color-warning);
  }

  &--user {
    background-color: var(--color-info-bg);
    color: var(--color-info);
  }

  &--external_provider {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
  }
}

.actions-cell {
  display: flex;
  gap: $spacing-2;
  align-items: center;
}

.btn--sm {
  padding: $spacing-2 $spacing-3;
  font-size: $font-size-sm;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;

  &--active {
    background-color: var(--color-success-bg);
    color: var(--color-success);
  }

  &--inactive {
    background-color: var(--bg-tertiary);
    color: var(--text-tertiary);
    border: 1px solid var(--border-light);
  }
}

.btn-icon--success {
  color: var(--color-success);

  &:hover {
    background-color: var(--color-success-bg);
  }
}

.toggle-inactive {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-size: $font-size-sm;
  color: var(--text-secondary);
  cursor: pointer;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--revaw-primary);
  }
}

.tenant-badge {
  display: inline-block;
  padding: $spacing-1 $spacing-2;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: var(--text-secondary);
  font-family: monospace;
}

.text-muted {
  color: var(--text-tertiary);
}

.form-hint-inline {
  font-size: $font-size-xs;
  color: var(--text-tertiary);
  font-weight: $font-weight-normal;
}

// Modal form
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.form-hint {
  display: block;
  margin-top: $spacing-1;
  font-size: $font-size-xs;
  color: var(--text-tertiary);
}

.password-rules {
  margin: $spacing-2 0 0 0;
  padding-left: $spacing-4;
  list-style: none;

  li {
    font-size: $font-size-xs;
    color: var(--text-tertiary);
    margin-bottom: $spacing-1;
    display: flex;
    align-items: center;
    gap: $spacing-1;

    &::before {
      content: '○';
      font-size: 8px;
    }

    &.valid {
      color: var(--color-success);

      &::before {
        content: '●';
      }
    }
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-weight: $font-weight-normal;
  cursor: pointer;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--revaw-primary);
  }

  span {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
}

// Animations
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// Responsive table
@media (max-width: $breakpoint-md) {
  .data-table {
    thead {
      display: none;
    }

    tbody tr {
      display: block;
      padding: $spacing-4;
      margin-bottom: $spacing-3;
      border: 1px solid var(--border-light);
      border-radius: $radius-lg;
      background-color: var(--bg-primary);
    }

    td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-2 0;
      border-bottom: 1px solid var(--border-light);

      &:last-child {
        border-bottom: none;
        padding-top: $spacing-3;
        justify-content: flex-start;
      }

      &::before {
        content: attr(data-label);
        font-weight: $font-weight-medium;
        color: var(--text-secondary);
        font-size: $font-size-xs;
        text-transform: uppercase;
      }
    }
  }

  .actions-cell {
    flex-wrap: wrap;
  }
}
</style>
