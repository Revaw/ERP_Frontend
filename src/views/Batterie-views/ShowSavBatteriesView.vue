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
        <div class="stat-item stat-item--warning">
          <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
          <span class="stat-item__value">{{ total }}</span>
          <span class="stat-item__label">Batteries en SAV</span>
        </div>
      </div>

      <!-- Liste des batteries SAV -->
      <ul class="battery-grid">
        <BatteryCard v-for="b in batteries" :key="b._id" :battery="b">
          <template #header-tags>
            <CustomTag :text="getSavStatusText(b)" :variant="getSavStatusVariant(b)" />
            <CustomTag :text="`Depuis ${getDaysSinceSavArrival(b)} j`" variant="grey-tag" />
          </template>
        </BatteryCard>
      </ul>
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

const batteries = ref([]) // Liste des batteries en SAV
const total = ref(0) // Compteur total pour l'affichage
const loading = ref(true) // État de chargement initial
const errorMsg = ref('') // Gestion des erreurs d'API

// --- LOGIQUE MÉTIER ---
/**
 * @description Charge la liste des batteries en SAV au montage du composant.
 */
const fetchSavData = async () => {
  try {
    loading.value = true
    const res = await getSavBatteries()

    batteries.value = res.data
    total.value = res.total
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
