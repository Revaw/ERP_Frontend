<template>
  <RouterLink :to="`/battery/${battery.NumeroSerie}`" class="battery-card">
    <!-- HEADER -->
    <div class="battery-card__header">
      <!-- Tous les tags passent par ce slot -->
      <div class="battery-card__tags">
        <slot name="header-tags" />
      </div>
    </div>

    <!-- CONTENU STATIQUE -->
    <ul class="battery-card__details">
      <li class="battery-card__serial">
        <span class="battery-card__label">N° Série</span>
        <strong>{{ battery.NumeroSerie }}</strong>
      </li>
      <li v-for="d in datesToShow" :key="d.label">
        <span class="battery-card__label">{{ d.label }}</span>
        <span>{{ d.value }}</span>
      </li>
    </ul>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
// Utils,
import { getBatteryDisplayDates } from '@/utils/batteryHelpers.js'

const props = defineProps({
  battery: {
    type: Object,
    required: true,
  },
})

/**
 * @description Récupère la liste des dates pertinentes à afficher (1 ou 2 lignes)
 * en fonction de l'état d'avancement de la batterie.
 */
const datesToShow = computed(() => getBatteryDisplayDates(props.battery))
</script>

<style lang="scss" scoped>
.battery-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--text-primary);
  padding: $spacing-4;
  border-radius: $radius-lg;
  border: 1px solid var(--border-default);
  background-color: var(--bg-primary);
  box-shadow: $shadow-xs;
  transition: all $transition-base;
  height: 100%;

  &:hover {
    border-color: var(--revaw-primary);
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }

  &__header {
    margin-bottom: $spacing-3;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
  }

  &__details {
    list-style: none;
    padding: 0;
    margin: 0;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: $spacing-2;

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: $font-size-sm;
      color: var(--text-primary);
      padding: $spacing-1 0;
      border-bottom: 1px solid var(--border-light);

      &:last-child {
        border-bottom: none;
      }
    }
  }

  &__serial {
    strong {
      font-weight: $font-weight-semibold;
      color: var(--revaw-primary);
    }
  }

  &__label {
    color: var(--text-secondary);
    font-size: $font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
}
</style>
