<template>
  <section class="bloc">
    <header class="bloc__header">
      <h3 class="bloc__title">{{ title }}</h3>
    </header>
    <div class="bloc__body">
      <slot></slot>
    </div>
  </section>
</template>

<script setup>
// Props reçues du parent
defineProps({
  title: {
    type: String,
    default: 'title',
  },
})
</script>

<style lang="scss" scoped>
.bloc {
  @include card;
  transition: all $transition-base;

  &__header {
    margin-bottom: $spacing-4;
    padding-bottom: $spacing-3;
    border-bottom: 1px solid var(--border-light);
  }

  &__title {
    margin: 0;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-2;

    @media (max-width: $breakpoint-sm) {
      font-size: $font-size-base;
    }
  }

  &__body {
    color: var(--text-primary);
  }
}
</style>
