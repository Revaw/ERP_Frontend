<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Historique des mouvements</h1>
      <p class="page__subtitle">Consultez l'ensemble des entrées, sorties et transferts</p>
    </div>

    <!-- Filtres -->
    <div class="filters-card">
      <div class="filters-card__header">
        <h3>
          <FontAwesomeIcon :icon="['fas', 'filter']" />
          Filtres
        </h3>
        <span class="filters-card__count">{{ rangeText }}</span>
      </div>

      <div class="filters-card__body">
        <!-- Filtres : entrées, sorties, transferts -->
        <div class="filters-group">
          <span class="filters-group__label">Type</span>
          <div class="filters-group__items">
            <label class="filter-check">
              <input type="checkbox" v-model="filters.in" />
              <CustomTag text="Entrées" variant="green-tag" />
            </label>

            <label class="filter-check">
              <input type="checkbox" v-model="filters.out" />
              <CustomTag text="Sorties" variant="red-tag" />
            </label>

            <label class="filter-check">
              <input type="checkbox" v-model="filters.transfer" />
              <CustomTag text="Transferts" variant="blue-tag" />
            </label>
          </div>
        </div>

        <!-- Filtres : inputs sku, source -->
        <div class="filters-group">
          <span class="filters-group__label">Recherche</span>
          <div class="filters-group__items">
            <div class="form-group form-group--inline">
              <label>SKU</label>
              <input type="text" v-model="filters.sku" placeholder="ex: VIS-001" />
            </div>

            <div class="form-group form-group--inline">
              <label>Source</label>
              <select v-model="filters.source">
                <option value="all">Toutes</option>
                <option value="manual">Manuel</option>
                <option value="production">Production</option>
                <option value="inventory">Inventaire</option>
                <option value="sav">SAV</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Filtres : dates -->
        <div class="filters-group">
          <span class="filters-group__label">Période</span>
          <div class="filters-group__items">
            <div class="form-group form-group--inline">
              <label>Du</label>
              <input type="date" v-model="filters.dateStart" />
            </div>
            <div class="form-group form-group--inline">
              <label>Au</label>
              <input type="date" v-model="filters.dateEnd" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenu -->
    <div class="content-section">
      <!-- Loader -->
      <div v-if="loading" class="loading-state">
        <Loader text="Chargement des mouvements..." />
      </div>

      <!-- Erreur -->
      <div v-else-if="errorMsg" class="error-state">
        <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Tableau -->
      <template v-else>
        <!-- Pagination haut -->
        <div class="pagination-bar">
          <Pagination
            :currentPage="currentPage"
            :totalPages="totalPages"
            @update:currentPage="loadPage"
          />
        </div>

        <div class="table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pièce</th>
                <th>Qté</th>
                <th>Motif</th>
                <th>Détails</th>
                <th>Note</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="m in movements" :key="m._id">
                <!-- date de creation -->
                <td data-label="Date" class="date-cell">{{ formatDate(m.createdAt) }}</td>
                <!-- sku & nom -->
                <td data-label="Pièce">
                  <div class="item-name">{{ m.name }}</div>
                  <div class="item-sku">{{ m.sku }}</div>
                </td>
                <!-- quantité & prix unitaire -->
                <td data-label="Quantité">
                  <span class="qty-badge" :class="m.qty > 0 ? 'qty-badge--in' : 'qty-badge--out'">
                    {{ m.qty > 0 ? '+' : '' }}{{ m.qty }}
                  </span>
                  <div class="price-mini" v-if="m.unit_price">{{ m.unit_price }}€/u</div>
                </td>
                <!-- motif -->
                <td data-label="Motif" class="reason-cell">{{ m.reason }}</td>
                <!-- location -->
                <td data-label="Détails">
                  <div v-if="m.location || (m.from_location && m.to_location)" class="detail-item">
                    <FontAwesomeIcon :icon="['fas', 'warehouse']" />
                    {{ getLocationDisplay(m) }}
                  </div>
                  <div v-if="m.battery_serial" class="detail-item">
                    <FontAwesomeIcon :icon="['fas', 'car-battery']" />
                    {{ m.battery_serial }}
                  </div>
                </td>
                <!-- commentaire -->
                <td data-label="Commentaire" class="comment-cell">{{ m.comment || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination bas -->
        <div class="pagination-bar">
          <Pagination
            :currentPage="currentPage"
            :totalPages="totalPages"
            @update:currentPage="loadPage"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
// Services API
import { getMovementsPaginated } from '@/services/stock.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
import { getLocationDisplay } from '@/utils/stockHelpers.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import CustomTag from '@/components/ui/CustomTag.vue'
import Loader from '@/components/ui/Loader.vue'
import Pagination from '@/components/ui/Pagination.vue'

// --- ÉTAT RÉACTIF (REFS) ---
const movements = ref([]) // Liste des mouvements affichés (après filtrage)
const loading = ref(true) // État de chargement
const currentPage = ref(0) // Page actuellement affichée
const totalPages = ref(1) // Nombre de pages disponibles
const errorMsg = ref('') // Message d'erreur;

// Filtres actifs (liés aux inputs du template)
const filters = ref({
  in: true, // checkbox: Entrees
  out: true, // checkbox: Sorties
  transfer: true, // checkbox: Transferts
  sku: '', // Recherche par SKU
  source: 'all', // Select: Origine (Manuel, Inventaire, SAV)
  dateStart: '', // Date de debut
  dateEnd: '', // Date de fin
})

/**
 * Surveille tout changement dans les filtres.
 * Recharge la page 0 à chaque modification pour rafraîchir les résultats.
 */
watch(
  filters,
  () => {
    loadPage(0)
  },
  { deep: true },
)

// --- LOGIQUE MÉTIER ---
/**
 * @description Charge les mouvements depuis le backend et applique les filtres locaux.
 * @param {Number} page - Numéro de page (0-indexed)
 * * ⚠️ NOTE TECHNIQUE :
 * Le backend gère la pagination et le filtre SKU.
 */
async function loadPage(page) {
  loading.value = true
  console.log('filters dateStart/dateEnd', filters.value.dateStart, filters.value.dateEnd)

  try {
    const res = await getMovementsPaginated({
      page: page + 1,
      limit: 100,
      sku: filters.value.sku || undefined,
      in: filters.value.in,
      out: filters.value.out,
      transfer: filters.value.transfer,
      source: filters.value.source,
      dateStart: filters.value.dateStart,
      dateEnd: filters.value.dateEnd,
    })

    console.log(res)

    movements.value = res.data
    currentPage.value = page
    totalPages.value = res.totalPages
  } catch {
    errorMsg.value = "Impossible de charger l'historique des mouvements."
  } finally {
    loading.value = false
  }
}

/**
 * @description Affiche la plage d'éléments (ex: "1 – 50").
 * Note: Ce texte est approximatif car le filtrage client réduit le nombre d'items affichés.
 */
const rangeText = computed(
  () => `${currentPage.value * 50 + 1} – ${currentPage.value * 50 + movements.value.length}`,
)

onMounted(() => loadPage(0))
</script>

<style lang="scss" scoped>
// Filtres
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
      display: flex;
      align-items: center;
      gap: $spacing-2;
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
      margin: 0;

      svg {
        color: var(--revaw-primary);
      }
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

// Contenu
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

// Pagination
.pagination-bar {
  display: flex;
  justify-content: center;
  margin: $spacing-5 0;
}

// Styles tableau
.item-name {
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
}

.item-sku {
  font-size: $font-size-xs;
  color: var(--text-secondary);
  margin-top: $spacing-1;
}

.qty-badge {
  display: inline-flex;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  min-width: 48px;
  justify-content: center;

  &--in {
    background-color: var(--tag-green-bg);
    color: var(--tag-green-text);
  }

  &--out {
    background-color: var(--tag-red-bg);
    color: var(--tag-red-text);
  }
}

.price-mini {
  font-size: $font-size-xs;
  color: var(--text-tertiary);
  margin-top: $spacing-1;
}

.date-cell {
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  color: var(--text-secondary);
}

.reason-cell {
  text-transform: capitalize;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-size: $font-size-sm;
  color: var(--text-secondary);

  svg {
    font-size: $font-size-xs;
    color: var(--text-tertiary);
  }

  & + & {
    margin-top: $spacing-1;
  }
}

.comment-cell {
  font-style: italic;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  max-width: 200px;
  @include truncate;

  @media (max-width: $breakpoint-md) {
    white-space: normal;
    max-width: none;
  }
}
</style>
