<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Détail BOM</h1>
        <p class="page__subtitle">Nomenclature et pièces détachées</p>
      </div>
      <ButtonBack />
    </div>

    <!-- Contenu principal -->
    <div v-if="bom" class="bom-card">
      <!-- En-tête BOM -->
      <div class="bom-header">
        <div class="bom-header__left">
          <h2 class="bom-header__title">
            <span class="battery-type">{{ bom.batteryType }}</span>
            <span class="location-badge">
              <FontAwesomeIcon :icon="['fas', 'warehouse']" />
              {{ bom.location }}
            </span>
          </h2>
          <span
            :class="[
              'status-badge',
              bom.isActive ? 'status-badge--active' : 'status-badge--inactive',
            ]"
          >
            {{ bom.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <div class="bom-header__right">
          <div class="meta-item">
            <span class="meta-item__label">Version</span>
            <span class="meta-item__value">{{ bom.version }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">Coût estimé</span>
            <span class="meta-item__value price-value">
              {{ formatPrice(bom.totalCost) }}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">Garantie</span>
            <span class="meta-item__value">{{ bom.warrantyDuration }} ans</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">Créée le</span>
            <span class="meta-item__value meta-item__value--date">{{
              formatDate(bom.createdAt)
            }}</span>
          </div>
        </div>
      </div>

      <!-- Section édition -->
      <div v-if="isEditing" class="edit-section">
        <div class="edit-section__grid">
          <div class="form-group">
            <label for="editVersion">Nouvelle version</label>
            <input
              id="editVersion"
              type="text"
              v-model="editForm.version"
              placeholder="ex: v2"
              required
            />
          </div>
          <div class="form-group">
            <label for="editWarranty">Durée de garantie (années)</label>
            <input
              id="editWarranty"
              type="number"
              v-model.number="editForm.warrantyDuration"
              min="1"
              required
            />
          </div>
        </div>
      </div>

      <!-- Liste des pièces -->
      <div class="parts-section">
        <h3 class="parts-section__title">
          <FontAwesomeIcon :icon="['fas', 'cubes']" />
          Liste des pièces
        </h3>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU - Nom</th>
                <th>Quantité</th>
                <th>Dernier prix</th>
                <th v-if="isEditing" class="col-action"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in isEditing ? editForm.items : bom.items" :key="index">
                <td data-label="Pièce">
                  <div v-if="isEditing" class="form-group form-group--inline">
                    <select v-model="item.sparePart" required>
                      <option value="" disabled>-- Choisir une pièce --</option>
                      <option v-for="part in spareParts" :key="part._id" :value="part._id">
                        {{ part.sku }} - {{ part.name }}
                      </option>
                    </select>
                  </div>
                  <div v-else class="part-info">
                    <span class="part-info__sku">{{ item.sparePart.sku }}</span>
                    <span class="part-info__name">{{ item.sparePart.name }}</span>
                  </div>
                </td>

                <td data-label="Quantité">
                  <input
                    v-if="isEditing"
                    type="number"
                    min="0"
                    v-model.number="item.quantity"
                    class="qty-input"
                  />
                  <span v-else class="qty-badge">{{ item.quantity }}</span>
                </td>

                <td data-label="Dernier prix">
                  <span class="price-value"> {{ item.totalLinePrice }} € </span>
                </td>

                <td v-if="isEditing" class="col-action">
                  <button class="btn-icon btn-icon--danger" @click="removeItem(index)">
                    <FontAwesomeIcon :icon="['fas', 'xmark']" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button v-if="isEditing" class="btn-add" @click="addItem">
          <FontAwesomeIcon :icon="['fas', 'plus']" />
          Ajouter une pièce
        </button>
      </div>

      <!-- Actions -->
      <div class="card-footer">
        <button v-if="bom.isActive && !isEditing" class="btn-primary" @click="startEdit">
          <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
          Modifier la BOM
        </button>

        <div v-if="isEditing" class="edit-actions">
          <button class="btn-secondary" @click="cancelEdit">Annuler</button>
          <button class="btn-primary" @click="submitEdit">
            <FontAwesomeIcon :icon="['fas', 'check']" />
            Valider
          </button>
        </div>
      </div>
    </div>

    <!-- État de chargement -->
    <div v-else class="loading-state">
      <Loader />
      <p>Chargement de la BOM...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
//store
import { useToastStore } from '@/stores/toast'
// Services API
import { getAllBOMs, replaceBOM } from '@/services/bom.js'
import { getAllSpareParts } from '@/services/spareParts.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'

// --- ROUTER & ÉTAT ---
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const bom = ref(null) // Objet BOM chargé depuis l'API
const isEditing = ref(false) // Mode édition actif/inactif
// Formulaire d'édition (initialisé vide)
const editForm = ref({ version: '', warrantyDuration: 0, items: [] })

const spareParts = ref([]) // Catalogue complet des pièces

// --- ACTIONS UI ---
/**
 * @description Bascule en mode édition et pré-remplit le formulaire avec les données actuelles.
 * On clone les données pour ne pas modifier l'affichage de lecture tant que ce n'est pas sauvegardé.
 */
const startEdit = () => {
  isEditing.value = true
  editForm.value = {
    version: '', // La version doit être saisie manuellement (ex: v1 -> v2)
    warrantyDuration: bom.value.warrantyDuration || 0,
    items: bom.value.items.map((item) => ({
      sparePart: item.sparePart._id,
      sku: item.sparePart.sku,
      name: item.sparePart.name,
      quantity: item.quantity,
    })),
  }
}
// ajoute une ligne de piece lors de l'edit de la BOM
const addItem = () => {
  editForm.value.items.push({ sparePart: '', quantity: 1 })
}
// supprime une ligne de piece lors de l'edit de la BOM
const removeItem = (index) => {
  editForm.value.items.splice(index, 1)
}
/**
 * @description Annule l'édition et vide le formulaire.
 */
const cancelEdit = () => {
  isEditing.value = false
  editForm.value = { version: '', warrantyDuration: 0, items: [] }
}

// --- LOGIQUE MÉTIER ---
/**
 * @description Soumet la nouvelle version de la BOM.
 * Note : Côté backend, cela ne modifie pas la BOM actuelle mais en crée une nouvelle (versioning)
 * et désactive l'ancienne.
 */
const submitEdit = async () => {
  try {
    if (!editForm.value.version) return toast.error('Version obligatoire')
    // Vérifier qu'aucune pièce n'est vide
    const hasEmptyPart = editForm.value.items.some((item) => !item.sparePart)
    if (hasEmptyPart) {
      return toast.error(
        'Veuillez sélectionner une pièce pour chaque ligne ou supprimer les lignes vides.',
      )
    }

    // Vérifier les quantités (sécurité supplémentaire contre modif DOM)
    const hasInvalidQty = editForm.value.items.some((item) => !item.quantity || item.quantity < 0)
    if (hasInvalidQty) {
      return toast.error('Toutes les quantités doivent être supérieures à 0.')
    }
    // Vérification des doublons de pièces
    const sparePartIds = editForm.value.items.map((item) => item.sparePart)
    // On crée un Set (collection unique) et on compare la taille
    const uniqueIds = new Set(sparePartIds)

    if (uniqueIds.size !== sparePartIds.length) {
      return toast.error(
        'Erreur : Vous avez ajouté plusieurs fois la même pièce. Veuillez regrouper les quantités sur une seule ligne.',
      )
    }
    // Construction du payload pour l'API
    const payload = {
      version: editForm.value.version,
      warrantyDuration: editForm.value.warrantyDuration,
      items: editForm.value.items.map((i) => ({ sparePart: i.sparePart, quantity: i.quantity })),
    }
    const newBom = await replaceBOM(bom.value._id, payload)
    isEditing.value = false
    toast.success('BOM mise à jour')
    // Redirection vers la page de détail de la NOUVELLE BOM
    router.push(`/admin/bom/${newBom._id}`)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur')
  }
}
/**
 * @description Charge la BOM correspondant à l'ID dans l'URL.
 * Note: getAllBOMs récupère tout, on filtre ensuite.
 */
const loadData = async () => {
  try {
    const [allBoms, allParts] = await Promise.all([getAllBOMs(), getAllSpareParts()])
    bom.value = allBoms.find((b) => b._id === route.params.id)
    spareParts.value = allParts
    console.log('bom.value', bom.value)
  } catch {
    toast.error('Erreur lors du chargement des données')
  }
}

const formatPrice = (value) => {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}
onMounted(loadData)

// Surveille l'URL pour recharger les données si l'ID change (ex: redirection après édition)
watch(
  () => route.params.id,
  () => {
    isEditing.value = false
    loadData()
  },
)
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

// BOM Card
.bom-card {
  @include card($spacing-6);
  margin-bottom: $spacing-8;

  @media (max-width: $breakpoint-sm) {
    padding: $spacing-4;
  }
}

// BOM Header
.bom-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-4;
  padding-bottom: $spacing-5;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: $spacing-5;

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
  }

  &__left {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
    color: var(--text-primary);
    margin: 0;

    @media (max-width: $breakpoint-sm) {
      flex-wrap: wrap;
    }
  }

  &__right {
    display: flex;
    gap: $spacing-5;

    @media (max-width: $breakpoint-sm) {
      flex-wrap: wrap;
      gap: $spacing-3;
    }
  }
}

.battery-type {
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

.meta-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  &__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-secondary);
  }

  &__value {
    font-weight: $font-weight-medium;
    color: var(--text-primary);

    &--date {
      color: var(--text-secondary);
      font-size: $font-size-sm;
    }
  }
}

// Edit section
.edit-section {
  background-color: var(--bg-secondary);
  padding: $spacing-4;
  border-radius: $radius-lg;
  margin-bottom: $spacing-5;
  border: 1px solid var(--border-default);

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-4;

    @media (max-width: $breakpoint-sm) {
      grid-template-columns: 1fr;
    }
  }
}

// Parts section
.parts-section {
  margin-top: $spacing-5;

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0 0 $spacing-4 0;

    svg {
      color: var(--text-secondary);
    }
  }
}

// Table
.table-wrapper {
  border: 1px solid var(--border-light);
  border-radius: $radius-lg;
  overflow: hidden;
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

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr {
    transition: background-color $transition-fast;

    &:hover {
      background-color: var(--bg-secondary);
    }
  }

  .col-action {
    width: 50px;
    text-align: center;
  }
}

.part-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  &__sku {
    font-family: $font-family-mono;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }

  &__name {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
}

.qty-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 $spacing-2;
  background-color: var(--revaw-primary-light);
  color: var(--revaw-primary);
  border-radius: $radius-md;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
}

.qty-input {
  width: 80px;
  padding: $spacing-2;
  text-align: center;
  border: 1px solid var(--input-border);
  border-radius: $radius-md;
  background-color: var(--input-bg);
  color: var(--text-primary);

  &:focus {
    border-color: var(--input-focus-border);
    outline: none;
    box-shadow: 0 0 0 3px var(--input-focus-ring);
  }
}

.form-group--inline {
  margin: 0;
}

// Add button
.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-2;
  width: 100%;
  margin-top: $spacing-4;
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

// Card footer
.card-footer {
  margin-top: $spacing-6;
  padding-top: $spacing-5;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
}

.edit-actions {
  display: flex;
  gap: $spacing-3;

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
    width: 100%;

    button {
      width: 100%;
      justify-content: center;
    }
  }
}

// Loading state
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-4;
  padding: $spacing-12;
  color: var(--text-tertiary);

  p {
    margin: 0;
    font-style: italic;
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
      padding: $spacing-3;
      border-bottom: 1px solid var(--border-light);

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-2 0;
      border-bottom: none;

      &::before {
        content: attr(data-label);
        font-weight: $font-weight-medium;
        color: var(--text-secondary);
        font-size: $font-size-xs;
        text-transform: uppercase;
      }
    }

    .col-action {
      justify-content: flex-end;

      &::before {
        display: none;
      }
    }
  }
}
</style>
