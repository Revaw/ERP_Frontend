<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Stock : {{ locationName }}</h1>
      <p class="page__subtitle">Liste des pièces détachées en stock</p>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="loading-state">
      <Loader text="Chargement du stock..." />
    </div>

    <!-- Contenu -->
    <template v-else>
      <!-- Stats rapides -->
      <div class="stats-bar">
        <div class="stat-item">
          <FontAwesomeIcon :icon="['fas', 'boxes-stacked']" />
          <span class="stat-item__value">{{ stocks.length }}</span>
          <span class="stat-item__label">Références</span>
        </div>
        <div class="stat-item stat-item--warning">
          <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
          <span class="stat-item__value">{{ criticalCount }}</span>
          <span class="stat-item__label">Stock critique</span>
        </div>
      </div>

      <!-- Bouton haut -->
      <div class="actions-header">
        <ExportExcelButton
          v-if="stocks.length > 0"
          :fetchFn="fetchForExport"
          :filename="`stock_${locationCode}`"
          label="Exporter"
          :columns="exportColumns"
        />
        <RouterLink
          v-if="authStore.isAdmin && locationCode"
          :to="{ name: 'inventory', params: { location: locationCode } }"
          class="btn-primary"
        >
          <FontAwesomeIcon :icon="['fas', 'clipboard-list']" />
          Faire un inventaire
        </RouterLink>
      </div>

      <!-- Filtre par nom -->
      <div class="search-bar">
        <FontAwesomeIcon :icon="['fas', 'magnifying-glass']" class="search-bar__icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="search-bar__input"
          placeholder="Rechercher par nom de pièce…"
          spellcheck="false"
        />
        <span v-if="searchQuery" class="search-bar__count">
          {{ filteredStocks.length }} / {{ stocks.length }}
        </span>
      </div>

      <!-- Tableau -->
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th class="th-sortable" @click="toggleSort">
                Référence
                <span class="sort-label">{{ sortDir === 'asc' ? 'A→Z' : 'Z→A' }}</span>
                <FontAwesomeIcon :icon="['fas', 'arrows-up-down']" class="sort-icon sort-icon--active" />
              </th>
              <th>Quantité</th>
              <th>Limite critique</th>
              <th>Dernière mise à jour</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredStocks.length === 0 && searchQuery" class="empty-row">
              <td colspan="4" class="empty-state">
                Aucune pièce ne correspond à « {{ searchQuery }} »
              </td>
            </tr>
            <tr
              v-for="stock in filteredStocks"
              :key="stock.sku"
              :class="{ 'row-critical': stock.quantity <= stock.criticalStock }"
            >
              <td data-label="Référence">
                <!-- nom et sku -->
                <div class="item-name">{{ stock.name }}</div>
                <div class="item-sku">{{ stock.sku }}</div>
              </td>
              <!-- quantité -->
              <td data-label="Quantité">
                <span class="qty-badge" :class="{ 'qty-badge--critical': stock.quantity <= stock.criticalStock }">
                  {{ stock.quantity }} {{ stock.unit || 'pce' }}
                </span>
              </td>
              <!-- limite critique -->
              <td data-label="Limite critique">
                <span v-if="stock.criticalStock > 0">{{ stock.criticalStock }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <!-- dernière MAJ -->
              <td data-label="Dernière MAJ">{{ formatDate(stock.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Actions Inventaire -->
      <div v-if="authStore.isAdmin" class="actions-footer">
        <RouterLink
          v-if="locationCode"
          :to="{ name: 'inventory', params: { location: locationCode } }"
          class="btn-primary"
        >
          <FontAwesomeIcon :icon="['fas', 'clipboard-list']" />
          Faire un inventaire
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast'
// Services API
import { getFilteredStocks } from '@/services/stock.js'
import { getAllLocations } from '@/services/locations.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'
import ExportExcelButton from '@/components/ui/ExportExcelButton.vue'

const authStore = useAuthStore() // Initialisation du store
const toast = useToastStore()

// --- ROUTER & ÉTAT ---
const route = useRoute() // Location depuis l'URL
const stocks = ref([]) // Liste des pieces en stock pour cette location
const locationCode = ref('') // Identifiant unique de l'emplacement (paramètre URL)
const locationName = ref('') // Nom lisible de l'emplacement (pour l'affichage)
const loading = ref(true) // Indicateur de chargement

const searchQuery = ref('')
const sortDir = ref('asc')

function toggleSort() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

const filteredStocks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = q
    ? stocks.value.filter(s =>
        s.name?.toLowerCase().includes(q) || s.sku?.toLowerCase().includes(q)
      )
    : [...stocks.value]

  const dir = sortDir.value === 'asc' ? 1 : -1
  return list.slice().sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', 'fr', { sensitivity: 'base' }) * dir
  )
})

// Nombre de pièces en stock critique
const criticalCount = computed(() => {
  return stocks.value.filter((s) => s.quantity <= s.criticalStock).length
})

/**
 * @description Charge les données nécessaires à la vue :
 * 1. Récupère le stock filtré pour l'emplacement actuel.
 * 2. Récupère les détails de l'emplacement pour afficher son "vrai" nom.
 */
const loadStockData = async () => {
  try {
    loading.value = true

    // 1. Initialisation depuis l'URL (ex: /stock/list/REVAW)
    locationCode.value = route.params.location

    // 2. Appel API : Stocks filtrés
    // On lance cette requête en premier car c'est la donnée critique
    stocks.value = await getFilteredStocks(locationCode.value)

    // 3. Appel API : Informations de l'emplacement
    // On récupère toutes les locations pour trouver le nom associé au code
    const locations = await getAllLocations()
    const loc = locations.find((l) => l.code === locationCode.value)

    // Fallback : si on ne trouve pas le nom, on affiche le code
    locationName.value = loc ? loc.name : locationCode.value
  } catch {
    toast.error('Erreur lors du chargement du stock')
  } finally {
    loading.value = false
  }
}

function fetchForExport() {
  return Promise.resolve(stocks.value)
}

const exportColumns = [
  { key: 'name', label: 'Pièce' },
  { key: 'sku', label: 'SKU' },
  { key: 'quantity', label: 'Quantité' },
  { key: 'unit', label: 'Unité' },
  { key: 'criticalStock', label: 'Limite critique' },
  { key: 'updatedAt', label: 'Dernière MAJ' },
]

onMounted(() => {
  loadStockData()
})
</script>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-bottom: $spacing-4;

  &__icon {
    color: var(--text-tertiary);
    font-size: $font-size-sm;
  }

  &__input {
    padding: $spacing-2 $spacing-3;
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    font-size: $font-size-sm;
    width: 280px;
    outline: none;
    transition: border-color $transition-fast;

    &:focus {
      border-color: var(--revaw-primary);
    }

    @media (max-width: $breakpoint-md) {
      width: 100%;
    }
  }

  &__count {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
}

.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;

  &:hover {
    color: var(--revaw-primary);
  }
}

.sort-label {
  margin-left: $spacing-1;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: var(--revaw-primary);
  min-width: 2.5ch;
  display: inline-block;
}

.sort-icon {
  margin-left: $spacing-1;
  font-size: $font-size-xs;
  opacity: 0.3;
  transition: opacity $transition-fast;

  &--active {
    opacity: 1;
    color: var(--revaw-primary);
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-12;
}

.stats-bar {
  display: flex;
  gap: $spacing-4;
  margin-bottom: $spacing-6;

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
    gap: $spacing-3;
  }
}

.stat-item {
  @include card($spacing-4);
  display: flex;
  align-items: center;
  gap: $spacing-3;
  min-width: 180px;

  svg {
    font-size: $font-size-xl;
    color: var(--revaw-primary);
  }

  &__value {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: var(--text-primary);
  }

  &__label {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }

  &--warning {
    svg {
      color: var(--color-warning);
    }

    .stat-item__value {
      color: var(--color-warning);
    }
  }
}

.item-name {
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
}

.item-sku {
  font-size: $font-size-xs;
  color: var(--text-secondary);
  margin-top: $spacing-1;
}

.text-muted {
  color: var(--text-tertiary);
}

.qty-badge {
  display: inline-flex;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  background-color: var(--tag-green-bg);
  color: var(--tag-green-text);

  &--critical {
    background-color: var(--tag-red-bg);
    color: var(--tag-red-text);
  }
}

.row-critical {
  background-color: var(--color-error-bg) !important;

  td {
    border-color: var(--tag-red-border);
  }
}

@media (max-width: $breakpoint-md) {
  .row-critical {
    border-left: 4px solid var(--color-error);
    background-color: var(--bg-primary) !important;
  }
}

.actions-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $spacing-4;

  @media (max-width: $breakpoint-md) {
    display: none;
  }
}

.actions-footer {
  margin-top: $spacing-6;
  display: flex;
  justify-content: flex-end;

  @media (max-width: $breakpoint-md) {
    position: fixed;
    bottom: $spacing-5;
    right: $spacing-5;
    z-index: 99;

    .btn-primary {
      border-radius: $radius-full;
      padding: $spacing-3 $spacing-5;
      box-shadow: $shadow-lg;
    }
  }
}
</style>
