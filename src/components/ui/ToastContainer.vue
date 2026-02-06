<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          :class="['toast', `toast--${toast.type}`]"
          @click="toastStore.remove(toast.id)"
        >
          <div class="toast__icon">
            <FontAwesomeIcon v-if="toast.type === 'success'" :icon="['fas', 'circle-check']" />
            <FontAwesomeIcon
              v-else-if="toast.type === 'error'"
              :icon="['fas', 'circle-exclamation']"
            />
            <FontAwesomeIcon v-else :icon="['fas', 'circle-info']" />
          </div>
          <span class="toast__message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
// Pas besoin d'importer FontAwesomeIcon si c'est global dans main.js

const toastStore = useToastStore()
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: $spacing-5;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
  pointer-events: none;
  width: 100%;
  max-width: 420px;
  padding: 0 $spacing-4;
}

.toast {
  pointer-events: auto;
  width: 100%;
  padding: $spacing-4 $spacing-5;
  border-radius: $radius-lg;
  background-color: var(--toast-bg);
  box-shadow: var(--toast-shadow);
  display: flex;
  align-items: center;
  gap: $spacing-3;
  cursor: pointer;
  font-weight: $font-weight-medium;
  font-size: $font-size-sm;
  color: var(--text-primary);
  border-left: 4px solid transparent;
  transition: all $transition-fast;

  &:hover {
    transform: translateX(4px);
  }

  &__icon {
    font-size: $font-size-lg;
    flex-shrink: 0;
  }

  &__message {
    flex: 1;
    line-height: $line-height-base;
  }

  &--success {
    border-left-color: var(--color-success);
    background-color: var(--color-success-bg);

    .toast__icon {
      color: var(--color-success);
    }
  }

  &--error {
    border-left-color: var(--color-error);
    background-color: var(--color-error-bg);

    .toast__icon {
      color: var(--color-error);
    }
  }

  &--info {
    border-left-color: var(--color-info);
    background-color: var(--color-info-bg);

    .toast__icon {
      color: var(--color-info);
    }
  }
}

// Animations
.toast-enter-active,
.toast-leave-active {
  transition: all $transition-slow ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform $transition-slow ease;
}
</style>
