<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">
        <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
        Batteries en SAV
      </h1>
      <p class="page__subtitle">Suivi des batteries en service après-vente</p>
      <RouterLink to="/sav/history" class="btn-history">
        <FontAwesomeIcon :icon="['fas', 'clock-rotate-left']" />
        Historique
      </RouterLink>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="loading-state">
      <Loader text="Chargement des batteries SAV..." />
    </div>

    <!-- Erreur -->
    <div v-else-if="errorMsg" class="error-state">
      <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
      <p>{{ errorMsg }}</p>
    </div>

    <!-- Contenu -->
    <template v-else>
      <!-- Stats -->
      <div class="stats-bar">
        <div class="stat-item stat-item--warning">
          <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
          <span class="stat-item__value">{{ total }}</span>
          <span class="stat-item__label">Batteries en SAV</span>
        </div>
      </div>

      <!-- Section Batteries en SAV (en cours de traitement) -->
      <section class="sav-section">
        <div class="sav-section__header">
          <div>
            <h2 class="sav-section__title">
              <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
              Batteries en SAV
            </h2>
            <p class="sav-section__subtitle">Batteries actuellement en cours de traitement</p>
          </div>
          <ExportExcelButton
            v-if="batteries.length > 0"
            :fetchFn="fetchBatteriesForExport"
            filename="batteries_sav"
            label="Exporter"
            :columns="exportBatteriesColumns"
          />
        </div>

        <ul class="battery-grid">
          <BatteryCard v-for="b in batteries" :key="b._id" :battery="b">
            <template #header-tags>
              <CustomTag :text="getSavStatusText(b)" :variant="getSavStatusVariant(b)" />
              <CustomTag :text="`Depuis ${getDaysSinceSavArrival(b)} j`" variant="grey-tag" />
            </template>
          </BatteryCard>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
// Services API
import { getSavBatteries } from '@/services/batteries.js'
// Utils, Logique métier
import {
  getSavStatusText,
  getSavStatusVariant,
  getDaysSinceSavArrival,
} from '@/utils/batteryHelpers.js'
// Composants UI
import BatteryCard from '@/components/batteries/BatteryCard.vue'
import CustomTag from '@/components/ui/CustomTag.vue'
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'
import ExportExcelButton from '@/components/ui/ExportExcelButton.vue'

const batteries = ref([])
const total = ref(0)
const loading = ref(true)
const errorMsg = ref('')

// --- LOGIQUE MÉTIER ---
const fetchSavData = async () => {
  try {
    loading.value = true

    const batteriesRes = await getSavBatteries()

    batteries.value = batteriesRes.data
    total.value = batteriesRes.total
  } catch (err) {
    console.error('Erreur chargement SAV:', err)
    errorMsg.value = 'Impossible de charger la liste des SAV. Veuillez réessayer plus tard.'
  } finally {
    loading.value = false
  }
}

function fetchBatteriesForExport() {
  return Promise.resolve(batteries.value)
}

const exportBatteriesColumns = [
  { key: 'NumeroSerie', label: 'N° Série' },
  { key: 'version', label: 'Version firmware' },
  { key: 'TimestampImpression', label: 'Date création' },
  { key: 'TimestampExpedition', label: 'Date expédition' },
]

onMounted(async () => {
  fetchSavData()
})
</script>

<style lang="scss" scoped>
.page__title {
  display: flex;
  align-items: center;
  gap: $spacing-3;

  svg {
    color: var(--color-error);
  }
}

.btn-history {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  background: transparent;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  text-decoration: none;
  transition: all $transition-fast;
  align-self: flex-start;

  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }
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

// Stats
.stats-bar {
  display: flex;
  gap: $spacing-4;
  margin-bottom: $spacing-6;
}

.stat-item {
  @include card($spacing-4);
  display: flex;
  align-items: center;
  gap: $spacing-3;

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
      color: var(--color-error);
    }

    .stat-item__value {
      color: var(--color-error);
    }
  }

  &--requests {
    svg {
      color: var(--color-warning);
    }

    .stat-item__value {
      color: var(--color-warning);
    }
  }
}

// Sections SAV
.sav-section {
  margin-bottom: $spacing-8;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: $spacing-4;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0 0 $spacing-1 0;
  }

  &__subtitle {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    margin: 0;
  }
}

// Grille batteries
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
