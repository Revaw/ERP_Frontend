<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Modèles de batterie</h1>
        <p class="page__subtitle">
          Référentiel des fiches modèles — données du passeport batterie UE 2023/1542
        </p>
      </div>
      <ButtonBack />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="btn-primary" @click="openAddModal">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Créer un modèle
      </button>
      <label class="checkbox-filter">
        <input type="checkbox" v-model="showInactive" />
        <span>Afficher les modèles désactivés</span>
      </label>
    </div>

    <!-- Tableau des modèles -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Énergie</th>
            <th>Capacité</th>
            <th>Poids</th>
            <th>Chimie</th>
            <th>Statut</th>
            <th>Créé le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="modele in filteredModeles" :key="modele._id">
            <td data-label="Nom">
              <span class="modele-nom">{{ modele.nom }}</span>
            </td>
            <td data-label="Énergie">{{ modele.capaciteKwh }} kWh</td>
            <td data-label="Capacité">{{ modele.capaciteAh }} Ah</td>
            <td data-label="Poids">
              {{ modele.poidsKg != null ? `${modele.poidsKg} kg` : '—' }}
            </td>
            <td data-label="Chimie">{{ modele.chimie || '—' }}</td>
            <td data-label="Statut">
              <span
                :class="[
                  'status-badge',
                  modele.isActive ? 'status-badge--active' : 'status-badge--inactive',
                ]"
              >
                {{ modele.isActive ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td data-label="Créé le">{{ formatDate(modele.createdAt) }}</td>
            <td data-label="Actions" class="actions-cell">
              <RouterLink :to="`/admin/modeles/${modele.nom}`" class="btn-secondary btn--sm">
                <FontAwesomeIcon :icon="['fas', 'eye']" />
                Détails
              </RouterLink>
              <button
                v-if="modele.isActive"
                class="btn-icon btn-icon--danger"
                @click="prepareDeactivate(modele)"
                title="Désactiver"
              >
                <FontAwesomeIcon :icon="['fas', 'ban']" />
              </button>
              <button
                v-else
                class="btn-icon"
                @click="handleReactivate(modele)"
                title="Réactiver"
              >
                <FontAwesomeIcon :icon="['fas', 'rotate-right']" />
              </button>
            </td>
          </tr>
          <tr v-if="filteredModeles.length === 0">
            <td colspan="8" class="empty-row">Aucun modèle — créez la première fiche.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal création -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal__header">
          <h2 class="modal__title">Créer un modèle</h2>
          <button class="btn-icon" @click="closeModal">
            <FontAwesomeIcon :icon="['fas', 'xmark']" />
          </button>
        </div>

        <form @submit.prevent="saveForm" class="modal__body">
          <div class="form-group">
            <label for="nom">Nom du modèle</label>
            <input
              id="nom"
              type="text"
              v-model="form.nom"
              @input="formatNom"
              placeholder="Ex: RW-48V27113"
              required
            />
            <p class="form-hint">
              ⚠️ Le nom est définitif : c'est la clé qui relie les batteries à cette fiche
              (celui imprimé sur l'étiquette).
            </p>
          </div>

          <div class="form-group">
            <label for="capaciteKwh">Énergie (kWh)</label>
            <input
              id="capaciteKwh"
              type="number"
              step="0.1"
              min="0"
              v-model.number="form.capaciteKwh"
              placeholder="Ex: 13"
              required
            />
          </div>

          <div class="form-group">
            <label for="capaciteAh">Capacité nominale (Ah)</label>
            <input
              id="capaciteAh"
              type="number"
              min="0"
              v-model.number="form.capaciteAh"
              placeholder="Ex: 271"
              required
            />
          </div>

          <p class="form-hint">
            Les autres champs (poids, tensions, environnement...) se renseignent depuis la
            fiche détail, chaque modification y est tracée.
          </p>
        </form>

        <div class="modal__footer">
          <button type="button" class="btn-secondary" @click="closeModal">Annuler</button>
          <button type="submit" class="btn-primary" @click="saveForm">
            <FontAwesomeIcon :icon="['fas', 'check']" />
            Créer
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal confirmation désactivation -->
  <Modal
    :isOpen="isConfirmModalOpen"
    title="Confirmer la désactivation"
    @close="isConfirmModalOpen = false"
  >
    <p v-if="modeleToDeactivate">
      Voulez-vous vraiment désactiver le modèle
      <strong>{{ modeleToDeactivate.nom }}</strong> ?
    </p>
    <p class="text-muted mt-2">
      La fiche ne sera plus modifiable ni listée par défaut, mais les batteries qui la
      référencent gardent leur lien. Aucune suppression.
    </p>

    <template #footer>
      <button class="btn-secondary" @click="isConfirmModalOpen = false">Annuler</button>
      <button class="btn-danger" @click="confirmDeactivate">
        <FontAwesomeIcon :icon="['fas', 'ban']" />
        Désactiver le modèle
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
//store
import { useToastStore } from '@/stores/toast'
// Services API
import {
  getAllModeles,
  createModele,
  deactivateModele,
  reactivateModele,
} from '@/services/modele.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Modal from '@/components/ui/Modal.vue'

const toast = useToastStore()

// --- ÉTAT RÉACTIF ---
const modeles = ref([]) // Liste complète des fiches (actives et inactives)
const isModalOpen = ref(false) // État d'ouverture de la modale de création
const showInactive = ref(false) // Filtre pour afficher/masquer les fiches désactivées
// Objet Formulaire pour la création (le détail s'édite depuis la fiche)
const form = ref({ nom: '', capaciteKwh: null, capaciteAh: null })

const filteredModeles = computed(() => {
  if (showInactive.value) {
    return modeles.value
  }
  return modeles.value.filter((modele) => modele.isActive)
})

// --- État pour la confirmation de désactivation ---
const isConfirmModalOpen = ref(false)
const modeleToDeactivate = ref(null)

/**
 * Prépare la désactivation en ouvrant la modale
 */
const prepareDeactivate = (modele) => {
  modeleToDeactivate.value = modele
  isConfirmModalOpen.value = true
}

/**
 * @description Ouvre la modale avec un formulaire réinitialisé.
 */
const openAddModal = () => {
  form.value = { nom: '', capaciteKwh: null, capaciteAh: null }
  isModalOpen.value = true
}
const closeModal = () => {
  isModalOpen.value = false
}

/**
 * @description Force la saisie du nom en majuscules (clé normalisée côté backend).
 */
const formatNom = () => {
  form.value.nom = form.value.nom.toUpperCase()
}

// --- LOGIQUE MÉTIER ---
/**
 * @description Envoie la nouvelle fiche au backend.
 * Si un modèle porte déjà ce nom, le backend renverra un 409.
 */
const saveForm = async () => {
  try {
    await createModele(form.value)
    modeles.value = await getAllModeles(true)
    toast.success(`Modèle ${form.value.nom} créé`)
    closeModal()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur création modèle')
  }
}

/**
 * Réactive une fiche désactivée (action directe, sans modale :
 * l'opération est sans risque et tracée dans l'historique)
 */
const handleReactivate = async (modele) => {
  try {
    await reactivateModele(modele.nom)
    modeles.value = await getAllModeles(true)
    toast.success(`Modèle ${modele.nom} réactivé`)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur réactivation')
  }
}

/**
 * Action réelle de désactivation appelée par le bouton de la modale
 */
const confirmDeactivate = async () => {
  if (!modeleToDeactivate.value) return

  try {
    await deactivateModele(modeleToDeactivate.value.nom)
    modeles.value = await getAllModeles(true)
    toast.success('Modèle désactivé')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur désactivation')
  } finally {
    isConfirmModalOpen.value = false
    modeleToDeactivate.value = null
  }
}

onMounted(async () => {
  try {
    // On charge tout (le filtre actif/inactif est fait côté front)
    modeles.value = await getAllModeles(true)
  } catch {
    toast.error('Erreur lors du chargement des modèles')
  }
})
</script>

<style lang="scss" scoped>
.page {
  max-width: 1400px;
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
  align-items: center;
  gap: $spacing-4;
  margin-bottom: $spacing-5;

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
    align-items: stretch;
  }
}

.checkbox-filter {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  font-size: $font-size-sm;
  color: var(--text-secondary);

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--revaw-primary);
  }
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

.modele-nom {
  font-weight: $font-weight-bold;
  color: var(--revaw-primary);
}

.empty-row {
  text-align: center;
  color: var(--text-tertiary);
  padding: $spacing-6;
}

.status-badge {
  display: inline-block;
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
  }
}

.actions-cell {
  display: flex;
  gap: $spacing-2;
  align-items: center;
}

.form-hint {
  font-size: $font-size-xs;
  color: var(--text-secondary);
  margin: $spacing-1 0 0 0;
}

// Modal
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: $spacing-4;
  backdrop-filter: blur(2px);
}

.modal {
  @include card($spacing-0);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp $transition-base ease-out;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-4 $spacing-5;
    border-bottom: 1px solid var(--border-light);
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0;
  }

  &__body {
    padding: $spacing-5;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-3;
    padding: $spacing-4 $spacing-5;
    border-top: 1px solid var(--border-light);
    background-color: var(--bg-secondary);
  }
}

.btn--sm {
  padding: $spacing-2 $spacing-3;
  font-size: $font-size-sm;
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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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
