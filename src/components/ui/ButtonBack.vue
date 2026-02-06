<template>
  <button class="btn-back" @click="goBack">
    <FontAwesomeIcon class="btn-back__icon" :icon="['fas', 'angle-left']" />
    <span>Retour</span>
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  margin-bottom: $spacing-5;
  background: transparent;
  border: none;
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    color: var(--revaw-primary);
    background-color: var(--bg-hover);

    .btn-back__icon {
      transform: translateX(-4px);
    }
  }

  &__icon {
    font-size: $font-size-base;
    transition: transform $transition-fast;
  }
}
</style>
