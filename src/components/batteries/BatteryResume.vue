<template>
  <div class="resume">
    <div class="resume__card">
      <div class="resume__header">
        <!--Resumé global-->
        <FontAwesomeIcon class="resume__icon" :icon="['fas', 'chart-pie']" />
        <h2 class="resume__title">Résumé global</h2>
      </div>
      <ul class="resume__list">
        <li class="resume__item">
          <span class="resume__label">Total batteries</span>
          <span class="resume__value">{{ total }}</span>
        </li>
        <li class="resume__item">
          <span class="resume__label">Total expédiées</span>
          <span class="resume__value resume__value--success">{{ totalExpediees }}</span>
        </li>
        <li class="resume__item">
          <span class="resume__label">SAV en cours</span>
          <span class="resume__value resume__value--warning">{{ totalSav }}</span>
        </li>
      </ul>
    </div>
    <!--Resumé mois en cours-->
    <div class="resume__card">
      <div class="resume__header">
        <div class="resume__header-left">
          <FontAwesomeIcon class="resume__icon" :icon="['fas', 'clock-rotate-left']" />
          <h2 class="resume__title">Mois en cours</h2>
        </div>
        <button class="btn-link" @click="$emit('open-mail-modal')">
          <FontAwesomeIcon :icon="['fas', 'copy']" />
          Mail de fin de mois
        </button>
      </div>
      <ul class="resume__list">
        <li class="resume__item">
          <span class="resume__label">Expédiées ce mois</span>
          <span class="resume__value">{{ moisExpediees }}</span>
        </li>
        <li class="resume__item">
          <span class="resume__label">Créées ce mois</span>
          <span class="resume__value">{{ moisCreees }}</span>
        </li>
        <li class="resume__item">
          <span class="resume__label">Dernière créée</span>
          <span class="resume__value">{{ derniereCree }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({
  total: {
    type: Number,
    default: 0,
  },
  totalExpediees: {
    type: Number,
    default: 0,
  },
  totalSav: {
    type: Number,
    default: 0,
  },
  moisExpediees: {
    type: Number,
    default: 0,
  },
  moisCreees: {
    type: Number,
    default: 0,
  },
  derniereCree: {
    type: String,
    default: '-',
  },
})
</script>

<style lang="scss" scoped>
.resume {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-5;
  margin-bottom: $spacing-6;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
    gap: $spacing-4;
  }

  &__card {
    @include card;
    transition: all $transition-base;

    &:hover {
      box-shadow: $shadow-md;
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-4;
    padding-bottom: $spacing-3;
    border-bottom: 1px solid var(--border-light);

    @media (max-width: $breakpoint-xs) {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-3;
    }
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__icon {
    font-size: $font-size-xl;
    color: var(--revaw-primary);
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0;
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
  }

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-2 0;
  }

  &__label {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }

  &__value {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);

    &--success {
      color: var(--color-success);
    }

    &--warning {
      color: var(--color-warning);
    }
  }
}
</style>
