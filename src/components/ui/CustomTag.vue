<template>
  <span :class="['custom-tag', `custom-tag--${variant}`]">
    {{ text }}
  </span>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'grey-tag',
    validator: (value) =>
      ['yellow-tag', 'green-tag', 'red-tag', 'grey-tag', 'blue-tag'].includes(value),
  },
})
</script>

<style lang="scss" scoped>
.custom-tag {
  display: inline-flex;
  align-items: center;
  padding: $spacing-1 $spacing-3;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  border: 1px solid;
  line-height: 1.2;
  white-space: nowrap;
  transition: all $transition-fast;

  @media (max-width: $breakpoint-xs) {
    font-size: 11px;
    padding: 3px $spacing-2;
  }

  &--yellow-tag {
    background-color: var(--tag-yellow-bg);
    color: var(--tag-yellow-text);
    border-color: var(--tag-yellow-border);
  }

  &--green-tag {
    background-color: var(--tag-green-bg);
    color: var(--tag-green-text);
    border-color: var(--tag-green-border);
  }

  &--red-tag {
    background-color: var(--tag-red-bg);
    color: var(--tag-red-text);
    border-color: var(--tag-red-border);
  }

  &--grey-tag {
    background-color: var(--tag-grey-bg);
    color: var(--tag-grey-text);
    border-color: var(--tag-grey-border);
  }

  &--blue-tag {
    background-color: var(--tag-blue-bg);
    color: var(--tag-blue-text);
    border-color: var(--tag-blue-border);
  }
}
</style>
