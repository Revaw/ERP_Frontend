<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Modèles & versions</h1>
        <p class="page__subtitle">
          Référentiel produit — fiches modèles (passeport UE 2023/1542) et versions firmware
        </p>
      </div>
      <ButtonBack />
    </div>

    <!-- Onglets du domaine : une version appartient à des modèles, les deux
         référentiels vivent sur la même page -->
    <div class="domain-tabs">
      <button
        :class="['domain-tab', { 'domain-tab--active': activeTab === 'modeles' }]"
        @click="switchTab('modeles')"
      >
        <FontAwesomeIcon :icon="['fas', 'id-card']" />
        Modèles
      </button>
      <button
        :class="['domain-tab', { 'domain-tab--active': activeTab === 'versions' }]"
        @click="switchTab('versions')"
      >
        <FontAwesomeIcon :icon="['fas', 'tag']" />
        Versions
      </button>
    </div>

    <AdminModeleView v-if="activeTab === 'modeles'" />
    <VersionsView v-else />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ButtonBack from '@/components/ui/ButtonBack.vue'
import AdminModeleView from './AdminModeleView.vue'
import VersionsView from './VersionsView.vue'

// L'onglet initial vient de la route (/admin/modeles ou /admin/versions),
// les deux URLs restent valides (liens existants, favoris)
const props = defineProps({
  tab: { type: String, default: 'modeles' },
})

const router = useRouter()
const activeTab = ref(props.tab)

watch(
  () => props.tab,
  (tab) => {
    activeTab.value = tab
  },
)

const switchTab = (tab) => {
  if (tab === activeTab.value) return
  // replace (pas push) : changer d'onglet ne doit pas empiler l'historique
  router.replace(tab === 'modeles' ? '/admin/modeles' : '/admin/versions')
}
</script>

<style lang="scss" scoped>
.page {
  max-width: 1400px;
  margin: 0 auto;
  padding: $spacing-6;
  animation: fadeIn $transition-base ease-out;

  @media (max-width: $breakpoint-sm) {
    padding: $spacing-4;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $spacing-4;
    margin-bottom: $spacing-5;

    @media (max-width: $breakpoint-sm) {
      flex-direction: column;
    }
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: var(--text-primary);
    margin: 0;
  }

  &__subtitle {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    margin: $spacing-1 0 0 0;
  }
}

.domain-tabs {
  display: inline-flex;
  gap: $spacing-1;
  padding: $spacing-1;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: $radius-md;
  margin-bottom: $spacing-5;
}

.domain-tab {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  border: none;
  background: transparent;
  border-radius: $radius-sm;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    color: var(--text-primary);
  }

  &--active {
    background-color: var(--bg-primary);
    color: var(--revaw-primary);
    font-weight: $font-weight-semibold;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
