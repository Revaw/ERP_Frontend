<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Gestion des BOM</h1>
        <p class="page__subtitle">Nomenclature des pièces par type de batterie</p>
      </div>
      <ButtonBack />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="btn-primary" @click="openAddModal">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Créer une BOM
      </button>
      <label class="checkbox-filter">
        <input type="checkbox" v-model="showInactive" />
        <span>Afficher les BOM inactives</span>
      </label>
    </div>

    <!-- Tableau des BOM -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Type batterie</th>
            <th>Emplacement</th>
            <th>Version</th>
            <th>Nb Pièces</th>
            <th>Garantie</th>
            <th>Statut</th>
            <th>Créée le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bom in filteredBoms" :key="bom._id">
            <td data-label="Type batterie">
              <span class="battery-type">{{ bom.batteryType }}</span>
            </td>
            <td data-label="Emplacement">
              <span class="location-badge">{{ bom.location }}</span>
            </td>
            <td data-label="Version">{{ bom.version }}</td>
            <td data-label="Nb Pièces">
              <span class="parts-count">{{ bom.items.length }}</span>
            </td>
            <td data-label="Garantie">{{ bom.warrantyDuration }} ans</td>
            <td data-label="Statut">
              <span
                :class="[
                  'status-badge',
                  bom.isActive ? 'status-badge--active' : 'status-badge--inactive',
                ]"
              >
                {{ bom.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td data-label="Créée le">{{ formatDate(bom.createdAt) }}</td>
            <td data-label="Actions" class="actions-cell">
              <RouterLink :to="`/admin/bom/${bom._id}`" class="btn-secondary btn--sm">
                <FontAwesomeIcon :icon="['fas', 'eye']" />
                Détails
              </RouterLink>
              <button
                v-if="bom.isActive"
                class="btn-icon btn-icon--danger"
                @click="prepareDeactivate(bom)"
                title="Désactiver"
              >
                <FontAwesomeIcon :icon="['fas', 'ban']" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal création -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal__header">
          <h2 class="modal__title">Créer une BOM</h2>
          <button class="btn-icon" @click="closeModal">
            <FontAwesomeIcon :icon="['fas', 'xmark']" />
          </button>
        </div>

        <form @submit.prevent="saveForm" class="modal__body">
          <div class="form-group">
            <label for="batteryType">Type de batterie</label>
            <input
              id="batteryType"
              type="text"
              v-model="form.batteryType"
              @input="formatBatteryType"
              maxlength="1"
              placeholder="Ex: A"
              required
            />
          </div>

          <div class="form-group">
            <label for="location">Emplacement</label>
            <select id="location" v-model="form.location" required>
              <option disabled value="">-- Choisir --</option>
              <option v-for="loc in locations" :key="loc._id" :value="loc.code">
                {{ loc.name }} ({{ loc.code }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="version">Version</label>
            <input id="version" type="text" v-model="form.version" placeholder="ex: v1" />
          </div>

          <div class="form-group">
            <label for="warranty">Durée de garantie (années)</label>
            <input
              id="warranty"
              type="number"
              v-model.number="form.warrantyDuration"
              min="1"
              required
              placeholder="ex: 2"
            />
          </div>

          <div class="form-group">
            <label>Liste des pièces</label>
            <div class="parts-editor">
              <div v-for="(item, index) in form.items" :key="index" class="part-row">
                <select v-model="item.sparePart" required>
                  <option disabled value="">Pièce...</option>
                  <option v-for="part in spareParts" :key="part._id" :value="part._id">
                    {{ part.name }} ({{ part.sku }})
                  </option>
                </select>
                <input
                  type="number"
                  min="1"
                  v-model.number="item.quantity"
                  placeholder="Qté"
                  required
                  class="part-row__qty"
                />
                <button type="button" class="btn-icon btn-icon--danger" @click="removeItem(index)">
                  <FontAwesomeIcon :icon="['fas', 'xmark']" />
                </button>
              </div>
              <button type="button" class="btn-add" @click="addItem">
                <FontAwesomeIcon :icon="['fas', 'plus']" />
                Ajouter une pièce
              </button>
            </div>
          </div>
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
  <Modal
    :isOpen="isConfirmModalOpen"
    title="Confirmer la désactivation"
    @close="isConfirmModalOpen = false"
  >
    <p v-if="bomToDeactivate">
      Voulez-vous vraiment désactiver la nomenclature pour le type
      <strong>{{ bomToDeactivate.batteryType }}</strong> (version {{ bomToDeactivate.version }}) ?
    </p>
    <p class="text-muted mt-2">
      Elle ne sera plus utilisée pour les nouvelles interventions mais restera consultable dans
      l'historique.
    </p>

    <template #footer>
      <button class="btn-secondary" @click="isConfirmModalOpen = false">Annuler</button>
      <button class="btn-danger" @click="confirmDeactivate">
        <FontAwesomeIcon :icon="['fas', 'ban']" />
        Désactiver la BOM
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
//store
import { useToastStore } from '@/stores/toast'
// Services API
import { getAllBOMs, createBOM, deactivateBOM } from '@/services/bom.js'
import { getAllSpareParts } from '@/services/spareParts.js'
import { getAllLocations } from '@/services/locations.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Modal from '@/components/ui/Modal.vue'

const toast = useToastStore()

// --- ÉTAT RÉACTIF ---
const boms = ref([]) // Liste complète des BOMs (actives et inactives)
const spareParts = ref([]) // Catalogue complet des pièces
const locations = ref([]) // Liste des entrepôts disponibles
const isModalOpen = ref(false) // État d'ouverture de la modale de création
// Liste statique des types de batteries supportés (va être dynamique plus tard)vvv
// Objet Formulaire pour la création
const form = ref({ batteryType: '', location: '', version: 'v1', warrantyDuration: 2, items: [] })
const showInactive = ref(false) // Filtre pour afficher/masquer les BOM inactives

const filteredBoms = computed(() => {
  if (showInactive.value) {
    return boms.value // Affiche toutes les BOM
  }
  return boms.value.filter((bom) => bom.isActive) // Affiche seulement les actives
})

// --- ACTIONS UI ---

// --- État pour la confirmation de désactivation ---
const isConfirmModalOpen = ref(false)
const bomToDeactivate = ref(null)

/**
 * Prépare la désactivation en ouvrant la modale
 */
const prepareDeactivate = (bom) => {
  bomToDeactivate.value = bom
  isConfirmModalOpen.value = true
}

/**
 * @description Ouvre la modale avec un formulaire réinitialisé aux valeurs par défaut.
 */
const openAddModal = () => {
  form.value = { batteryType: '', location: '', version: 'v1', warrantyDuration: 2, items: [] }
  isModalOpen.value = true
}
const closeModal = () => {
  isModalOpen.value = false
}
// --- GESTION DES ITEMS (Lignes de pièces) ---
/**
 * @description Ajoute une ligne vide dans la liste des pièces de la BOM.
 */
const addItem = () => {
  form.value.items.push({ sparePart: '', quantity: 1 })
}
/**
 * @description Supprime une ligne de pièce par son index.
 */
const removeItem = (index) => {
  form.value.items.splice(index, 1)
}

/**
 * @description Force la saisie en majuscule et limite à 1 caractère
 */
const formatBatteryType = () => {
  form.value.batteryType = form.value.batteryType.toUpperCase().slice(0, 1)
}

// --- LOGIQUE MÉTIER ---
/**
 * @description Envoie la nouvelle BOM au backend.
 * Si une BOM active existe déjà pour ce couple Type/Lieu, le backend renverra une erreur (409).
 */
const saveForm = async () => {
  try {
    await createBOM(form.value)
    // Rechargement de la liste après succès
    boms.value = await getAllBOMs()
    closeModal()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur création BOM')
  }
}
/**
 * Action réelle de désactivation appelée par le bouton de la modale
 */
const confirmDeactivate = async () => {
  if (!bomToDeactivate.value) return

  try {
    await deactivateBOM(bomToDeactivate.value._id)
    boms.value = await getAllBOMs()
    toast.success('BOM désactivée')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur désactivation')
  } finally {
    isConfirmModalOpen.value = false
    bomToDeactivate.value = null
  }
}
onMounted(async () => {
  try {
    // Chargement parallèle pour optimiser le temps d'affichage
    const [bomsData, partsData, locsData] = await Promise.all([
      getAllBOMs(),
      getAllSpareParts(),
      getAllLocations(),
    ])

    boms.value = bomsData
    spareParts.value = partsData
    locations.value = locsData
  } catch {
    toast.error('Erreur lors du chargement des données')
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

.battery-type {
  font-weight: $font-weight-bold;
  font-size: $font-size-lg;
  color: var(--revaw-primary);
}

.location-badge {
  display: inline-flex;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-1 $spacing-2;
  background-color: var(--color-info-bg);
  color: var(--color-info);
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
}

.parts-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 $spacing-2;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
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

// Parts editor in modal
.parts-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.part-row {
  display: flex;
  gap: $spacing-3;
  align-items: center;

  select {
    flex: 1;
  }

  &__qty {
    width: 80px;
    text-align: center;
  }

  @media (max-width: $breakpoint-sm) {
    flex-wrap: wrap;

    select {
      width: 100%;
    }

    &__qty {
      flex: 1;
    }
  }
}

.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-2;
  width: 100%;
  padding: $spacing-3;
  background-color: transparent;
  border: 1px dashed var(--border-default);
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    border-color: var(--revaw-primary);
    color: var(--revaw-primary);
    background-color: var(--revaw-primary-light);
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
