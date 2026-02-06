<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="loader">
    <div class="loader__spinner"></div>
    <p class="loader__text">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: 'Chargement...',
  },
})
</script>

<style lang="scss" scoped>
.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-4;
  padding: $spacing-8;

  &__spinner {
    width: 44px;
    height: 44px;
    border: 3px solid var(--border-light);
    border-top-color: var(--revaw-primary);
    border-radius: $radius-full;
    animation: spin 0.8s linear infinite;
  }

  &__text {
    color: var(--text-secondary);
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    margin: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
