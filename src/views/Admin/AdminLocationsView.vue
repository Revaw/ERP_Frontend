<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Gestion des Locations</h1>
        <p class="page__subtitle">Emplacements de stockage et entrepôts</p>
      </div>
      <ButtonBack />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="btn-primary" @click="openAddModal">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Ajouter une location
      </button>
    </div>

    <!-- Tableau des locations -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Nom</th>
            <th>Date de création</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loc in locations" :key="loc._id">
            <td data-label="Code">
              <span class="code-badge">{{ loc.code }}</span>
            </td>
            <td data-label="Nom">{{ loc.name }}</td>
            <td data-label="Date création">{{ formatDate(loc.createdAt) }}</td>
            <td data-label="Actions" class="actions-cell">
              <button class="btn-secondary btn--sm" @click="openEditModal(loc)">
                <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
                Modifier
              </button>
              <button
                class="btn-icon btn-icon--danger"
                @click="prepareDeactivate(loc.code)"
                title="Désactiver"
              >
                <FontAwesomeIcon :icon="['fas', 'ban']" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal de création/modification -->
    <Modal
      :isOpen="isModalOpen"
      :title="isEditing ? 'Modifier la location' : 'Ajouter une location'"
      @close="closeModal"
    >
      <form @submit.prevent="saveForm" class="modal-form">
        <div class="form-group">
          <label for="locationCode">Code (unique)</label>
          <input
            id="locationCode"
            type="text"
            v-model="form.code"
            :disabled="isEditing"
            required
            placeholder="EX: ENTREPOT-A"
          />
        </div>
        <div class="form-group">
          <label for="locationName">Nom</label>
          <input
            id="locationName"
            type="text"
            v-model="form.name"
            required
            placeholder="Nom descriptif"
          />
        </div>
      </form>

      <template #footer>
        <button class="btn-secondary" @click="closeModal">Annuler</button>
        <button class="btn-primary" @click="saveForm">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          {{ isEditing ? 'Modifier' : 'Ajouter' }}
        </button>
      </template>
    </Modal>
    <!-- Modal de confirmation de desactivation -->
    <Modal
      :isOpen="isConfirmModalOpen"
      title="Confirmer la désactivation"
      @close="isConfirmModalOpen = false"
    >
      <p>
        Voulez-vous vraiment désactiver la localisation
        <strong>{{ locationToDeactivate }}</strong> ?
      </p>
      <p class="text-muted mt-2">
        Cette action est réversible, mais ne peut pas être effectuée si du stock est présent.
      </p>

      <template #footer>
        <button class="btn-secondary" @click="isConfirmModalOpen = false">Annuler</button>
        <button class="btn-danger" @click="confirmDeactivate">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          Confirmer la désactivation
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
//store
import { useToastStore } from '@/stores/toast'
// Services API
import {
  getAllLocations,
  createLocation,
  updateLocation,
  deactivateLocation,
} from '@/services/locations.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Modal from '@/components/ui/Modal.vue'

const toast = useToastStore()

// --- ÉTAT RÉACTIF (REFS) ---
const locations = ref([]) // Liste des emplacements chargés
const isModalOpen = ref(false) // Visibilité de la modale (Création/Édition)
const isEditing = ref(false) // Mode de la modale : false = Création, true = Édition
const isConfirmModalOpen = ref(false) // Visibilité de la modale de confirmation
const locationToDeactivate = ref(null) // Location à désactiver

// Objet formulaire pour la modale
const form = ref({
  code: '', // Identifiant unique (ex: REVAW) - Non modifiable en édition
  name: '', // Nom d'affichage (ex: Usine Principale)
})

// --- UTILITAIRES LOCAUX ---
/**
 * @description Standardise le code location (Majuscules, sans espaces autour).
 * @param {String} value
 */
const normalizeCode = (value) => value.trim().toUpperCase()

// --- GESTION DE LA MODALE ---
/**
 * @description Ouvre la modale en mode "Création" avec un formulaire vierge.
 */
const openAddModal = () => {
  isEditing.value = false
  form.value = { code: '', name: '' }
  isModalOpen.value = true
}
/**
 * @description Ouvre la modale en mode "Édition" pré-remplie.
 * @param {Object} loc - L'objet location à modifier
 */
const openEditModal = (loc) => {
  isEditing.value = true
  // On copie les valeurs pour ne pas modifier la liste en direct
  form.value = { code: loc.code, name: loc.name }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

// --- LOGIQUE MÉTIER ---
/**
 * @description Soumet le formulaire au backend.
 * Gère la distinction Création (POST) / Modification (PUT).
 */
const saveForm = async () => {
  try {
    // Nettoyage des données avant envoi
    const payload = { code: normalizeCode(form.value.code), name: form.value.name.trim() }
    // Mode Édition : Seul le nom est modifiable, le code sert d'ID
    if (isEditing.value) {
      await updateLocation(payload.code, { name: payload.name })
    } else {
      // Mode Création : Code et Nom sont envoyés
      await createLocation(payload)
    }
    // Rafraîchissement de la liste et fermeture
    locations.value = await getAllLocations()
    toast.success(isEditing.value ? 'Location modifiée' : 'Location créée')
    closeModal()
  } catch (err) {
    console.error('Erreur sauvegarde location:', err)
    // Affiche le message d'erreur du backend (ex: "Code déjà existant")
    toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde')
  }
}

/**
 * Prépare la désactivation en ouvrant la modale.
 */
const prepareDeactivate = (code) => {
  locationToDeactivate.value = code
  isConfirmModalOpen.value = true
}

/**
 * Action réelle de désactivation appelée par le bouton "Confirmer" de la modale
 */
const confirmDeactivate = async () => {
  if (!locationToDeactivate.value) return

  try {
    await deactivateLocation(locationToDeactivate.value)
    locations.value = await getAllLocations()
    toast.success('Location désactivée')
  } catch (err) {
    toast.error(err.response?.status === 409 ? err.response.data.message : 'Erreur désactivation')
  } finally {
    isConfirmModalOpen.value = false
    locationToDeactivate.value = null
  }
}

onMounted(async () => {
  try {
    locations.value = await getAllLocations()
  } catch {
    toast.error('Erreur lors du chargement des locations')
  }
})
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
  justify-content: flex-end;
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

.code-badge {
  display: inline-block;
  padding: $spacing-1 $spacing-2;
  background-color: var(--revaw-primary-light);
  color: var(--revaw-primary);
  border-radius: $radius-sm;
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
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

// Modal form
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
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
