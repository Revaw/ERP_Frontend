<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div v-if="totalPages > 1" class="pagination">
    <!-- Bouton précédent -->
    <button
      class="pagination-btn pagination-btn--nav"
      :disabled="currentPage === 0"
      @click="goToPage(currentPage - 1)"
    >
      <FontAwesomeIcon :icon="['fas', 'chevron-left']" />
    </button>

    <!-- Pages -->
    <template v-for="(item, index) in visiblePages" :key="index">
      <span v-if="item === '...'" class="pagination-ellipsis">...</span>
      <button
        v-else
        :class="['pagination-btn', { active: item - 1 === currentPage }]"
        @click="goToPage(item - 1)"
      >
        {{ item }}
      </button>
    </template>

    <!-- Bouton suivant -->
    <button
      class="pagination-btn pagination-btn--nav"
      :disabled="currentPage === totalPages - 1"
      @click="goToPage(currentPage + 1)"
    >
      <FontAwesomeIcon :icon="['fas', 'chevron-right']" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['update:currentPage'])

/**
 * @description Calcule les pages à afficher avec ellipses
 * Exemple pour 20 pages, page courante 10: [1, '...', 8, 9, 10, 11, 12, '...', 20]
 */
const visiblePages = computed(() => {
  const total = props.totalPages
  const current = props.currentPage + 1 // Convertir en 1-indexed pour l'affichage

  // Si peu de pages, afficher toutes
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = []
  const siblings = 1 // Nombre de pages à afficher de chaque côté de la page courante

  // Toujours afficher la première page
  pages.push(1)

  // Calculer le début et la fin de la plage centrale
  const rangeStart = Math.max(2, current - siblings)
  const rangeEnd = Math.min(total - 1, current + siblings)

  // Ellipsis après la première page si nécessaire
  if (rangeStart > 2) {
    pages.push('...')
  }

  // Pages centrales
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i)
  }

  // Ellipsis avant la dernière page si nécessaire
  if (rangeEnd < total - 1) {
    pages.push('...')
  }

  // Toujours afficher la dernière page
  if (total > 1) {
    pages.push(total)
  }

  return pages
})

const goToPage = (page) => {
  if (page >= 0 && page < props.totalPages) {
    emit('update:currentPage', page)
  }
}
</script>

<style lang="scss" scoped>
.pagination {
  display: flex;
  gap: $spacing-1;
  align-items: center;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 $spacing-2;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background-color: var(--bg-hover);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.active {
    background-color: var(--revaw-primary);
    border-color: var(--revaw-primary);
    color: var(--text-inverse);
  }

  &--nav {
    svg {
      font-size: $font-size-xs;
    }
  }
}

.pagination-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  color: var(--text-secondary);
  font-size: $font-size-sm;
}
</style>
