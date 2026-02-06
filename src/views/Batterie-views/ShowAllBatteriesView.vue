<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Production</h1>
      <p class="page__subtitle">Gestion des batteries en production</p>
    </div>

    <div class="filters-card">
      <div class="filters-card__header">
        <h3>Filtres</h3>
        <span class="filters-card__count">{{ rangeText }}</span>
      </div>

      <div class="filters-card__body">
        <div class="filters-group">
          <span class="filters-group__label">Statut</span>
          <div class="filters-group__items">
            <label class="filter-check">
              <input type="checkbox" v-model="filters.prod" />
              <CustomTag text="En production" variant="yellow-tag" />
            </label>
            <label class="filter-check">
              <input type="checkbox" v-model="filters.exp" />
              <CustomTag text="Expédiée" variant="green-tag" />
            </label>
            <label class="filter-check">
              <input type="checkbox" v-model="filters.sav" />
              <CustomTag text="SAV" variant="red-tag" />
            </label>
            <label class="filter-check">
              <input type="checkbox" v-model="filters.wait" />
              <CustomTag text="En stock" variant="blue-tag" />
            </label>
            <label class="filter-check">
              <input type="checkbox" v-model="filters.isCanceled" />
              <CustomTag text="Annulée" variant="red-tag" />
            </label>
          </div>
        </div>

        <div class="filters-group">
          <span class="filters-group__label">Période d'éxpeditions</span>
          <div class="filters-group__items">
            <div class="form-group form-group--inline">
              <label>Du</label>
              <input type="date" v-model="filters.startDate" />
            </div>
            <div class="form-group form-group--inline">
              <label>Au</label>
              <input type="date" v-model="filters.endDate" />
            </div>
          </div>
        </div>

        <div class="filters-group">
          <span class="filters-group__label">Modèle</span>
          <div class="form-group form-group--inline">
            <select v-model="filters.kwh">
              <option value="">Tous les modèles</option>
              <option value="13">13 kWh</option>
              <option value="12">12 kWh</option>
              <option value="8.4">8.4 kWh</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="content-section">
      <div v-if="loading" class="loading-state">
        <Loader text="Chargement des batteries..." />
      </div>

      <div v-else-if="errorMsg" class="error-state">
        <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
        <p>{{ errorMsg }}</p>
      </div>

      <template v-else>
        <div class="pagination-bar">
          <Pagination
            :currentPage="currentPage - 1"
            :totalPages="totalPages"
            @update:currentPage="(p) => loadPage(p + 1)"
          />
        </div>

        <ul class="battery-grid">
          <BatteryCard v-for="b in batteries" :key="b._id" :battery="b">
            <template #header-tags>
              <CustomTag :text="getStatusText(b)" :variant="getStatusVariant(b)" />
              <CustomTag :text="getBatteryKwh(b)" variant="grey-tag" />
            </template>
          </BatteryCard>
        </ul>

        <div class="pagination-bar">
          <Pagination
            :currentPage="currentPage - 1"
            :totalPages="totalPages"
            @update:currentPage="(p) => loadPage(p + 1)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
// Composants UI
import BatteryCard from '@/components/batteries/BatteryCard.vue'
import CustomTag from '@/components/ui/CustomTag.vue'
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Pagination from '@/components/ui/Pagination.vue'
import Loader from '@/components/ui/Loader.vue'
// Services & Utils
import { getBatteriesPaginated } from '@/services/batteries.js'
import { getStatusText, getStatusVariant, getBatteryKwh } from '@/utils/batteryHelpers.js'

// --- DONNÉES & PAGINATION ---
const batteries = ref([]) // Stock la liste des batteries
const totalBatteries = ref(0) // Nombre total de batteries correspondant aux filtres
const loading = ref(true) // Indicateur de chargement
const errorMsg = ref('') // Message d'erreur
// Pagination
const currentPage = ref(1)
const totalPages = ref(1)

// --- ÉTAT RÉACTIF : FILTRES ---
// critères de filtrage envoyés au backend.
const filters = ref({
  prod: true, // Checkbox: Afficher "En production"
  exp: true, // Checkbox: Afficher "Expédiée"
  sav: true, // Checkbox: Afficher "SAV"
  wait: true, // Checkbox: Afficher "En stock"
  isCanceled: false, // Checkbox: Afficher "Annulée" (Défaut à false pour ne pas polluer la vue)
  startDate: null, // Date début (Filtre sur date expédition)
  endDate: null, // Date fin
  kwh: '', // Sélecteur : Filtrage par modèle (13, 12, 8.4)
})

//Surveille l'objet 'filters'.
watch(
  filters,
  () => {
    loadPage(1)
  },
  { deep: true },
)

// --- LOGIQUE MÉTIER ---
/**
 * @description Fonction principale de récupération des données.
 * Appelle le service API avec la page demandée et les filtres actuels.
 * * @param {number} page - Numéro de la page à charger (0-indexed)
 */
async function loadPage(page) {
  loading.value = true
  try {
    const res = await getBatteriesPaginated(page, 100, filters.value)
    batteries.value = res.data
    currentPage.value = res.page
    totalPages.value = res.totalPages
    totalBatteries.value = res.total || 0
    console.log(res)
  } catch {
    errorMsg.value =
      'Impossible de charger les batteries, erreur serveur, vérifiez votre connection internet.'
  } finally {
    loading.value = false
  }
}

// --- COMPUTED ---

// Génère le texte de résumé du nombre de résultats (ex: "5 batteries trouvées").
const rangeText = computed(() => {
  const count = totalBatteries.value
  const s = count > 1 ? 's' : ''
  return `${count} batterie${s} trouvée${s}`
})

onMounted(async () => {
  await loadPage(1)
})
</script>

<style lang="scss" scoped>
.filters-card {
  @include card;
  margin-bottom: $spacing-6;
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-4;
    padding-bottom: $spacing-3;
    border-bottom: 1px solid var(--border-light);

    h3 {
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
      margin: 0;
    }
  }

  &__count {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    background-color: var(--bg-tertiary);
    padding: $spacing-1 $spacing-3;
    border-radius: $radius-full;
  }

  &__body {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: $spacing-6;

    @media (max-width: $breakpoint-lg) {
      flex-direction: column;
      gap: $spacing-4;
    }
  }
}

.filters-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  &__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  &__items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-3;
  }
}

.filter-check {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  min-height: 38px; // Aligner avec la hauteur des inputs

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--revaw-primary);
  }
}

.form-group--inline {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-bottom: 0;

  label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
    margin-bottom: 0;
    white-space: nowrap;
  }

  input,
  select {
    padding: $spacing-2 $spacing-3;
    min-width: 140px;
  }
}

.content-section {
  min-height: 400px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-12;
  text-align: center;
}

.error-state {
  color: var(--color-error);
  gap: $spacing-3;

  svg {
    font-size: 48px;
    opacity: 0.5;
  }

  p {
    font-size: $font-size-base;
    margin: 0;
  }
}

.pagination-bar {
  display: flex;
  justify-content: center;
  margin: $spacing-5 0;
}

.battery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-4;
  padding: 0;
  list-style: none;

  @media (max-width: $breakpoint-xl) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: $breakpoint-sm) {
    grid-template-columns: 1fr;
  }
}
</style>
