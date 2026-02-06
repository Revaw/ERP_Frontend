<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Pièces Détachées</h1>
      <p class="page__subtitle">Gestion des stocks et des mouvements</p>
    </div>

    <!-- Section Stock par Location -->
    <h2 class="section-title">
      <FontAwesomeIcon :icon="['fas', 'warehouse']" />
      Gestion des entrepôts
    </h2>
    <div class="nav-grid">
      <RouterLink
        v-for="loc in locations"
        :key="loc._id"
        :to="`/stock/list/${loc.code}`"
        class="nav-card"
      >
        <div class="nav-card__icon">
          <FontAwesomeIcon :icon="['fas', 'cubes-stacked']" />
        </div>
        <span class="nav-card__label">Stock {{ loc.name }}</span>
      </RouterLink>
    </div>

    <!-- Gestion des pieces detachées -->
    <h2 class="section-title">
      <FontAwesomeIcon :icon="['fas', 'gear']" />
      Outils
    </h2>
    <div class="nav-grid">
      <RouterLink v-if="authStore.isAdmin" to="/stock/movement/form" class="nav-card">
        <div class="nav-card__icon nav-card__icon--green">
          <FontAwesomeIcon :icon="['fas', 'arrows-turn-to-dots']" />
        </div>
        <span class="nav-card__label">Entrée / Sortie / Transfert</span>
      </RouterLink>

      <RouterLink to="/spare-parts/list" class="nav-card">
        <div class="nav-card__icon nav-card__icon--blue">
          <FontAwesomeIcon :icon="['fas', 'list']" />
        </div>
        <span class="nav-card__label">Liste des pièces détachées</span>
      </RouterLink>

      <RouterLink to="/stock/movement/list" class="nav-card">
        <div class="nav-card__icon nav-card__icon--purple">
          <FontAwesomeIcon :icon="['fas', 'clock-rotate-left']" />
        </div>
        <span class="nav-card__label">Historique des mouvements</span>
      </RouterLink>
    </div>

    <!-- Gestion des Administrateurs -->
    <template v-if="authStore.isAdmin">
      <h2 class="section-title">
        <FontAwesomeIcon :icon="['fas', 'users-gear']" />
        Espace Administrateur
      </h2>
      <div class="nav-grid">
        <RouterLink to="/admin/bom" class="nav-card nav-card--dashed">
          <div class="nav-card__icon nav-card__icon--orange">
            <FontAwesomeIcon :icon="['fas', 'layer-group']" />
          </div>
          <span class="nav-card__label">Gestion des BOM</span>
        </RouterLink>

        <RouterLink to="/admin/locations" class="nav-card nav-card--dashed">
          <div class="nav-card__icon nav-card__icon--orange">
            <FontAwesomeIcon :icon="['fas', 'warehouse']" />
          </div>
          <span class="nav-card__label">Gestion des lieux de stockage</span>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
// Composants
import ButtonBack from '@/components/ui/ButtonBack.vue'
// Services
import { getAllLocations } from '@/services/locations.js'

const authStore = useAuthStore() // Initialisation du store

const locations = ref([]) // Liste des lieux de stockages

onMounted(async () => {
  // Récupérer la liste des lieux de stockages
  locations.value = await getAllLocations()
})
</script>

<style lang="scss" scoped>
.section-title {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
  margin-top: $spacing-8;
  margin-bottom: $spacing-4;

  svg {
    color: var(--revaw-primary);
    font-size: $font-size-base;
  }

  &:first-of-type {
    margin-top: 0;
  }
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-4;

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

.nav-card {
  @include card($spacing-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-3;
  text-decoration: none;
  transition: all $transition-base;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-lg;
    border-color: var(--revaw-primary);

    .nav-card__icon {
      transform: scale(1.1);
    }
  }

  &--dashed {
    border-style: dashed;
    opacity: 0.8;

    &:hover {
      opacity: 1;
    }
  }

  &__icon {
    width: 64px;
    height: 64px;
    border-radius: $radius-lg;
    background-color: var(--revaw-primary-light);
    color: var(--revaw-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-2xl;
    transition: transform $transition-base;

    &--green {
      background-color: var(--color-success-bg);
      color: var(--color-success);
    }

    &--blue {
      background-color: var(--color-info-bg);
      color: var(--color-info);
    }

    &--purple {
      background-color: var(--role-superadmin-bg);
      color: var(--role-superadmin-text);
    }

    &--orange {
      background-color: var(--color-warning-bg);
      color: var(--color-warning);
    }
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    text-align: center;
  }
}
</style>
