<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">
        <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
        Batteries en SAV
      </h1>
      <p class="page__subtitle">Suivi des batteries en service après-vente</p>
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
        <div v-if="savRequests.length > 0" class="stat-item stat-item--requests">
          <FontAwesomeIcon :icon="['fas', 'inbox']" />
          <span class="stat-item__value">{{ savRequests.length }}</span>
          <span class="stat-item__label">Demandes SAV</span>
        </div>
        <div class="stat-item stat-item--warning">
          <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
          <span class="stat-item__value">{{ total }}</span>
          <span class="stat-item__label">Batteries en SAV</span>
        </div>
      </div>

      <!-- Section Demandes SAV (requêtes prestataires) -->
      <section v-if="savRequests.length > 0" class="sav-section">
        <h2 class="sav-section__title">
          <FontAwesomeIcon :icon="['fas', 'inbox']" />
          Demandes SAV
        </h2>
        <p class="sav-section__subtitle">Requêtes envoyées par les prestataires</p>

        <ul class="battery-grid">
          <BatteryCard
            v-for="r in savRequests"
            :key="r._id"
            :battery="{ NumeroSerie: r.batterySerial }"
          >
            <template #details>
              <li class="detail-row">
                <span class="detail-label">Prestataire</span>
                <span>{{ r.requestedBy?.username || 'Inconnu' }}</span>
              </li>
              <li class="detail-row">
                <span class="detail-label">Date demande</span>
                <span>{{ formatDate(r.requestedAt) }}</span>
              </li>
              <li class="detail-motif">
                <span class="detail-label">Motif</span>
                <span class="detail-motif__content">{{ r.reason }}</span>
              </li>
            </template>
          </BatteryCard>
        </ul>
      </section>

      <!-- Section Batteries en SAV (en cours de traitement) -->
      <section class="sav-section">
        <h2 class="sav-section__title">
          <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
          Batteries en SAV
        </h2>
        <p class="sav-section__subtitle">Batteries actuellement en cours de traitement</p>

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
import { getSavRequests } from '@/services/sav.js'
// Utils, Logique métier
import {
  getSavStatusText,
  getSavStatusVariant,
  getDaysSinceSavArrival,
} from '@/utils/batteryHelpers.js'
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import BatteryCard from '@/components/batteries/BatteryCard.vue'
import CustomTag from '@/components/ui/CustomTag.vue'
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'

const batteries = ref([])
const savRequests = ref([])
const total = ref(0)
const loading = ref(true)
const errorMsg = ref('')

// --- LOGIQUE MÉTIER ---
const fetchSavData = async () => {
  try {
    loading.value = true

    const [batteriesRes, requestsRes] = await Promise.all([getSavBatteries(), getSavRequests()])

    batteries.value = batteriesRes.data
    total.value = batteriesRes.total
    savRequests.value = requestsRes
    console.log(savRequests.value)
  } catch (err) {
    console.error('Erreur chargement SAV:', err)
    errorMsg.value = 'Impossible de charger la liste des SAV. Veuillez réessayer plus tard.'
  } finally {
    loading.value = false
  }
}

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
    margin: 0 0 $spacing-4 0;
  }
}

// Détails slottés dans BatteryCard
.detail-row,
.detail-motif {
  display: flex;
  font-size: $font-size-sm;
  color: var(--text-primary);
  padding: $spacing-1 0;
  border-bottom: 1px solid var(--border-light);

  &:last-child {
    border-bottom: none;
  }
}

.detail-row {
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  color: var(--text-secondary);
  font-size: $font-size-xs;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.detail-motif {
  flex-direction: column;
  align-items: flex-start;
  gap: $spacing-1;

  &__content {
    font-size: $font-size-xs;
    color: var(--text-secondary);
    line-height: 1.4;
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
