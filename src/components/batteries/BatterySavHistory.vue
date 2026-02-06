<template>
  <div v-if="history.length" class="history-list">
    <div v-for="entry in history" :key="entry.date_arrivee" class="history-item">
      <div class="history-item__grid">
        <div class="history-item__cell">
          <span class="history-item__label">Arrivée</span>
          <span class="history-item__value">{{ formatDate(entry.date_arrivee) }}</span>
        </div>
        <div class="history-item__cell">
          <span class="history-item__label">Départ</span>
          <span class="history-item__value">{{ formatDate(entry.date_depart) || '—' }}</span>
        </div>
        <div class="history-item__cell">
          <span class="history-item__label">Durée</span>
          <span class="history-item__value">{{ calculateDuration(entry.date_arrivee, entry.date_depart) }}</span>
        </div>
        <div class="history-item__cell">
          <span class="history-item__label">Statut</span>
          <span class="history-item__value">
            {{ entry.technical_status || entry.status || 'En cours' }}
          </span>
        </div>
      </div>

      <div class="history-item__footer">
        <div class="history-item__motif">
          <strong>Motif :</strong> {{ entry.motif || 'Non renseigné' }}
          <span v-if="entry.location" class="location-badge">
            <FontAwesomeIcon :icon="['fas', 'warehouse']" />
            {{ entry.location }}
          </span>
        </div>

        <div v-if="entry.parts_used?.length" class="parts-list">
          <strong>Pièces remplacées :</strong>
          <ul>
            <li v-for="p in entry.parts_used" :key="p.sku">{{ p.sku }} × {{ p.qty }}</li>
          </ul>
        </div>
        <div v-else class="parts-list--empty">Aucune pièce remplacée</div>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <FontAwesomeIcon :icon="['fas', 'clock-rotate-left']" />
    <p>Aucun historique SAV disponible</p>
  </div>
</template>

<script setup>
import { formatDate } from '@/utils/formatDate'

defineProps({
  history: {
    type: Array,
    required: true,
  },
})

// Helper local pour la durée
const calculateDuration = (start, end) => {
  if (!start) return 'N/A'
  const endDate = end ? new Date(end) : new Date()
  const diff = Math.ceil((endDate - new Date(start)) / 86400000)
  return `${diff} jour${diff > 1 ? 's' : ''}`
}
</script>

<style lang="scss" scoped>
.history-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.history-item {
  border: 1px solid var(--border-default);
  border-radius: $radius-lg;
  padding: $spacing-4;
  background-color: var(--bg-secondary);

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-3;

    @media (max-width: $breakpoint-sm) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__cell {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-secondary);
  }

  &__value {
    font-weight: $font-weight-medium;
    color: var(--text-primary);
  }

  &__footer {
    margin-top: $spacing-4;
    padding: $spacing-3;
    border: 1px solid var(--border-light);
    border-radius: $radius-md;
    background-color: var(--bg-primary);
    font-size: $font-size-sm;
  }

  &__motif {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-2;
  }
}

.location-badge {
  display: inline-flex;
  align-items: center;
  gap: $spacing-1;
  background-color: var(--color-info-bg);
  color: var(--color-info);
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;

  svg {
    font-size: 10px;
  }
}

.parts-list {
  margin-top: $spacing-3;

  ul {
    margin: $spacing-2 0 0 0;
    padding-left: $spacing-5;
    color: var(--text-secondary);
  }

  li {
    margin-bottom: $spacing-1;
  }

  &--empty {
    margin-top: $spacing-3;
    color: var(--text-tertiary);
    font-style: italic;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-8;
  color: var(--text-tertiary);
  text-align: center;

  svg {
    font-size: 32px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-style: italic;
  }
}
</style>
