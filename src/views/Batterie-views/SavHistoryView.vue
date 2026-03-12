<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">
        <FontAwesomeIcon :icon="['fas', 'clock-rotate-left']" />
        Historique SAV
      </h1>
      <p class="page__subtitle">Interventions SAV archivées</p>
    </div>

    <!-- Filtres -->
    <div class="filters-card">
      <div class="filters-card__header">
        <h3>
          <FontAwesomeIcon :icon="['fas', 'filter']" />
          Filtres
        </h3>
        <div class="filters-card__header-right">
          <button class="btn-reset" @click="resetFilters" title="Réinitialiser les filtres">
            <FontAwesomeIcon :icon="['fas', 'rotate-left']" />
            Réinitialiser
          </button>
          <ExportExcelButton
            v-if="total > 0"
            :fetchFn="fetchForExport"
            filename="historique_sav"
            label="Exporter"
            :columns="exportColumns"
          />
          <span class="filters-card__count">{{ rangeText }}</span>
        </div>
      </div>

      <div class="filters-card__body">
        <div class="filters-group">
          <span class="filters-group__label">Recherche</span>
          <div class="filters-group__items">
            <div class="form-group form-group--inline">
              <label>N° Série</label>
              <input type="text" v-model="filters.serial" placeholder="ex: BAT-0001" />
            </div>
            <div class="form-group form-group--inline">
              <label>Statut</label>
              <select v-model="filters.status">
                <option value="">Tous</option>
                <option value="en cours">En cours</option>
                <option value="réparée">Réparée</option>
                <option value="annulée">Annulée</option>
              </select>
            </div>
          </div>
        </div>

        <div class="filters-group">
          <span class="filters-group__label">Période d'arrivée</span>
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
      </div>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="loading-state">
      <Loader text="Chargement de l'historique..." />
    </div>

    <!-- Erreur -->
    <div v-else-if="errorMsg" class="error-state">
      <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
      <p>{{ errorMsg }}</p>
    </div>

    <!-- Vide -->
    <div v-else-if="interventions.length === 0" class="empty-state">
      <FontAwesomeIcon :icon="['fas', 'inbox']" />
      <p>Aucune intervention trouvée.</p>
    </div>

    <!-- Tableau -->
    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>N° Série</th>
            <th>Date arrivée</th>
            <th>Motif</th>
            <th>Statut</th>
            <th>Localisation</th>
            <th>Pièces utilisées</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in interventions" :key="item._id">
            <td>
              <RouterLink :to="`/battery/${item.battery_serial}`" class="serial-link">
                {{ item.battery_serial }}
              </RouterLink>
            </td>
            <td>{{ formatDate(item.linked_date_arrivee) }}</td>
            <td>{{ item.motif || '—' }}</td>
            <td>
              <CustomTag :text="item.status" :variant="statusVariant(item.status)" />
            </td>
            <td>{{ item.location }}</td>
            <td>
              <span v-if="!item.parts_used || item.parts_used.length === 0">—</span>
              <span v-else class="parts-list">
                <span v-for="p in item.parts_used" :key="p.sku" class="part-chip">
                  {{ p.sku }} × {{ p.qty }}
                </span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination__btn">
        <FontAwesomeIcon :icon="['fas', 'chevron-left']" />
      </button>
      <span class="pagination__info">Page {{ currentPage }} / {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination__btn">
        <FontAwesomeIcon :icon="['fas', 'chevron-right']" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getSavHistory } from '@/services/sav.js'
import { formatDate } from '@/utils/formatDate.js'
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'
import CustomTag from '@/components/ui/CustomTag.vue'
import ExportExcelButton from '@/components/ui/ExportExcelButton.vue'

const LIMIT = 20

const interventions = ref([])
const total = ref(0)
const currentPage = ref(1)
const loading = ref(false)
const errorMsg = ref('')

const filters = ref({
  serial: '',
  status: '',
  startDate: '',
  endDate: '',
})

const defaultFilters = { serial: '', status: '', startDate: '', endDate: '' }

const totalPages = computed(() => Math.ceil(total.value / LIMIT) || 1)

const rangeText = computed(() => {
  if (total.value === 0) return 'Aucun résultat'
  const start = (currentPage.value - 1) * LIMIT + 1
  const end = Math.min(currentPage.value * LIMIT, total.value)
  return `${start}-${end} sur ${total.value}`
})

const exportColumns = [
  { key: 'battery_serial', label: 'N° Série' },
  { key: 'linked_date_arrivee', label: "Date d'arrivée" },
  { key: 'motif', label: 'Motif' },
  { key: 'status', label: 'Statut' },
  { key: 'location', label: 'Localisation' },
]

function statusVariant(status) {
  if (status === 'réparée') return 'green-tag'
  if (status === 'annulée') return 'grey-tag'
  return 'orange-tag'
}

async function fetchData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await getSavHistory(currentPage.value, LIMIT, filters.value)
    interventions.value = res.data
    total.value = res.total
  } catch (err) {
    errorMsg.value = "Impossible de charger l'historique SAV."
  } finally {
    loading.value = false
  }
}

async function fetchForExport() {
  const res = await getSavHistory(1, LIMIT, { ...filters.value, all: true })
  return res.data
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

function resetFilters() {
  filters.value = { ...defaultFilters }
  currentPage.value = 1
}

watch(filters, () => { currentPage.value = 1 }, { deep: true })
watch([currentPage, filters], fetchData, { deep: true })

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.page__title {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  svg { color: var(--revaw-primary); }
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-12;
  text-align: center;
  color: var(--text-secondary);
  gap: $spacing-3;
  svg { font-size: 48px; opacity: 0.4; }
}

.error-state { color: var(--color-error); }

// Filtres
.filters-card {
  @include card($spacing-4);
  margin-bottom: $spacing-6;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-4;

    h3 {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      margin: 0;
    }
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__count {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  &__body { display: flex; flex-direction: column; gap: $spacing-4; }
}

.filters-group {
  display: flex;
  align-items: flex-start;
  gap: $spacing-4;

  &__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    padding-top: $spacing-2;
    min-width: 120px;
  }

  &__items {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-3;
    align-items: center;
  }
}

.form-group--inline {
  display: flex;
  align-items: center;
  gap: $spacing-2;

  label {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  input, select {
    padding: $spacing-1 $spacing-3;
    border: 1px solid var(--border-default);
    border-radius: $radius-md;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    font-size: $font-size-sm;
  }
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  background: transparent;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover { background-color: var(--bg-hover); color: var(--text-primary); }
}

// Tableau
.table-wrapper {
  @include card(0);
  overflow-x: auto;
  margin-bottom: $spacing-6;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;

  th {
    padding: $spacing-3 $spacing-4;
    text-align: left;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--border-default);
    white-space: nowrap;
  }

  td {
    padding: $spacing-3 $spacing-4;
    border-bottom: 1px solid var(--border-light);
    color: var(--text-primary);
    vertical-align: middle;
  }

  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background-color: var(--bg-hover); }
}

.serial-link {
  color: var(--revaw-primary);
  text-decoration: none;
  font-weight: $font-weight-medium;
  &:hover { text-decoration: underline; }
}

.parts-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-1;
}

.part-chip {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: $radius-sm;
  padding: 2px $spacing-2;
  font-size: $font-size-xs;
  white-space: nowrap;
}

// Pagination
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-4;
  margin-top: $spacing-4;

  &__btn {
    padding: $spacing-2 $spacing-3;
    border: 1px solid var(--border-default);
    border-radius: $radius-md;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) { background-color: var(--bg-hover); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }

  &__info {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
}
</style>
