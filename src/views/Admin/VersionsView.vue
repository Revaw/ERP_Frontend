<template>
  <div class="page">
    <div class="page__header">
      <h1 class="page__title">Versions firmware</h1>
      <p class="page__subtitle">Catalogue des versions disponibles pour les batteries</p>
    </div>

    <!-- Toolbar (moderateur+) -->
    <div v-if="authStore.isAdmin" class="toolbar">
      <button class="btn-primary" @click="openAdd">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Nouvelle version
      </button>
    </div>

    <!-- Loader / Erreur -->
    <div v-if="loading" class="loading-state">
      <Loader />
    </div>
    <div v-else-if="error" class="error-state">
      <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
      <p>{{ error }}</p>
      <button class="btn-secondary" @click="load">Réessayer</button>
    </div>

    <!-- Tableau -->
    <div v-else class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Modèles</th>
            <th>Description</th>
            <th>Chemin fichier</th>
            <th>Statut</th>
            <th>Créée le</th>
            <th v-if="authStore.isAdmin">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in versions" :key="v._id" :class="{ 'row-inactive': v.isActive === false }">
            <td data-label="Version" class="version-cell">{{ v.version }}</td>
            <!-- Deux versions peuvent porter le même numéro (produits différents) :
                 les modèles concernés les désambiguïsent -->
            <td data-label="Modèles">
              <span v-if="v.modeles?.length" class="modeles-chips">
                <span v-for="m in v.modeles" :key="m" class="modele-chip">{{ m }}</span>
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <td data-label="Description" class="text-muted">{{ v.description || '—' }}</td>
            <td data-label="Chemin" class="path-cell">{{ v.path || '—' }}</td>
            <td data-label="Statut">
              <span :class="['status-badge', v.isActive === false ? 'status-badge--inactive' : 'status-badge--active']">
                {{ v.isActive === false ? 'Désactivée' : 'Active' }}
              </span>
            </td>
            <td data-label="Créée le" class="text-muted">{{ formatDate(v.createdAt) }}</td>
            <td v-if="authStore.isAdmin" data-label="Actions" class="actions-cell">
              <button
                class="btn-icon btn-icon--primary"
                title="Modifier"
                @click="openEdit(v)"
              >
                <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
              </button>
              <button
                v-if="v.isActive !== false"
                class="btn-icon btn-icon--danger"
                title="Désactiver"
                @click="toggleActive(v, false)"
              >
                <FontAwesomeIcon :icon="['fas', 'ban']" />
              </button>
              <button
                v-else
                class="btn-icon btn-icon--success"
                title="Réactiver"
                @click="toggleActive(v, true)"
              >
                <FontAwesomeIcon :icon="['fas', 'rotate-right']" />
              </button>
            </td>
          </tr>
          <tr v-if="versions.length === 0">
            <td colspan="7" class="empty-state">Aucune version enregistrée.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal créer / éditer -->
    <Modal
      :isOpen="isModalOpen"
      :title="isEditing ? `Modifier — ${form.version}` : 'Nouvelle version'"
      @close="closeModal"
    >
      <form class="version-form" @submit.prevent="saveForm">
        <div class="form-group">
          <label for="v-version">Version <span class="form-required">*</span></label>
          <input
            id="v-version"
            v-model="form.version"
            placeholder="Ex : 1.4.2"
            required
          />
        </div>
        <div class="form-group">
          <label>Modèles concernés</label>
          <div class="modeles-checkboxes">
            <label v-for="m in modelesDisponibles" :key="m.nom" class="modele-checkbox">
              <input type="checkbox" :value="m.nom" v-model="form.modeles" />
              <span>{{ m.nom }} ({{ m.capaciteKwh }} kWh)</span>
            </label>
            <p v-if="modelesDisponibles.length === 0" class="text-muted">
              Aucune fiche modèle — les créer d'abord dans « Modèles de batterie ».
            </p>
          </div>
        </div>
        <div class="form-group">
          <label for="v-description">Description</label>
          <input
            id="v-description"
            v-model="form.description"
            placeholder="Résumé des changements…"
          />
        </div>
        <div class="form-group">
          <label for="v-path">Chemin fichier <span class="form-optional">(URL ou chemin PDF)</span></label>
          <input
            id="v-path"
            v-model="form.path"
            placeholder="Ex : /files/firmware_v1.4.2.pdf"
          />
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="closeModal">Annuler</button>
        <button class="btn-primary" :disabled="saving" @click="saveForm">
          <FontAwesomeIcon :icon="['fas', saving ? 'spinner' : 'check']" :spin="saving" />
          {{ isEditing ? 'Enregistrer' : 'Créer' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'
import { getAllVersions, createVersion, updateVersion } from '@/services/versions.js'
import { getAllModeles } from '@/services/modele.js'
import Modal from '@/components/ui/Modal.vue'
import Loader from '@/components/ui/Loader.vue'

const authStore = useAuthStore()
const toast = useToastStore()

const versions = ref([])
const loading = ref(false)
const error = ref(null)
const saving = ref(false)
const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = ref({ version: '', description: '', path: '', modeles: [] })
const modelesDisponibles = ref([]) // fiches modèles actives (checkboxes de la modale)

async function load() {
  loading.value = true
  error.value = null
  try {
    versions.value = await getAllVersions()
  } catch (err) {
    error.value = err.response?.data?.message || 'Impossible de charger les versions'
  } finally {
    loading.value = false
  }
}

async function loadModeles() {
  try {
    modelesDisponibles.value = await getAllModeles()
  } catch {
    // Silencieux : la vue reste utilisable, les checkboxes seront vides
  }
}

function openAdd() {
  isEditing.value = false
  editingId.value = null
  form.value = { version: '', description: '', path: '', modeles: [] }
  isModalOpen.value = true
}

function openEdit(v) {
  isEditing.value = true
  editingId.value = v._id
  form.value = {
    version: v.version,
    description: v.description || '',
    path: v.path || '',
    modeles: [...(v.modeles || [])],
  }
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

async function saveForm() {
  if (!form.value.version.trim()) {
    toast.error('Le champ version est obligatoire')
    return
  }
  if (form.value.modeles.length === 0) {
    toast.error('Sélectionner au moins un modèle concerné')
    return
  }
  saving.value = true
  try {
    if (isEditing.value) {
      await updateVersion(editingId.value, {
        version: form.value.version,
        description: form.value.description,
        path: form.value.path,
        modeles: form.value.modeles,
      })
      toast.success('Version mise à jour')
    } else {
      await createVersion({
        version: form.value.version,
        description: form.value.description,
        path: form.value.path,
        modeles: form.value.modeles,
      })
      toast.success('Version créée')
    }
    closeModal()
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement")
  } finally {
    saving.value = false
  }
}

async function toggleActive(v, isActive) {
  try {
    await updateVersion(v._id, { isActive })
    toast.success(isActive ? 'Version réactivée' : 'Version désactivée')
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur')
  }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

onMounted(() => {
  load()
  loadModeles()
})
</script>

<style lang="scss" scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $spacing-5;
}

.version-cell {
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
  font-family: $font-family-mono;
}

.path-cell {
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  color: var(--text-secondary);
}

.text-muted {
  color: var(--text-tertiary);
  font-size: $font-size-sm;
}

// Chips des modèles concernés par une version
.modeles-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: $spacing-1;
}

.modele-chip {
  padding: $spacing-1 $spacing-2;
  background-color: var(--color-info-bg);
  color: var(--color-info);
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  font-family: $font-family-mono;
}

// Checkboxes de sélection des modèles (modale)
.modeles-checkboxes {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
}

.modele-checkbox {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  font-size: $font-size-sm;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--revaw-primary);
  }
}

.row-inactive {
  opacity: 0.55;
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

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-10 0;
  color: var(--text-secondary);
}

.version-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.form-required {
  color: var(--color-error);
  margin-left: $spacing-1;
}

.form-optional {
  font-size: $font-size-xs;
  color: var(--text-tertiary);
  font-weight: $font-weight-normal;
  margin-left: $spacing-1;
}
</style>
