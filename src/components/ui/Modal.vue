<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay">
        <!-- Contenu de la modal -->
        <div class="modal-content">
          <!-- Header avec titre et bouton fermer -->
          <div class="modal-header">
            <h2>{{ title }}</h2>
            <button class="modal-close" @click="closeModal" aria-label="Fermer">
              <FontAwesomeIcon :icon="['fas', 'xmark']" />
            </button>
          </div>
          <!-- Body : SLOT pour mettre n'importe quel contenu -->
          <div class="modal-body">
            <slot></slot>
          </div>
          <!-- Footer : SLOT optionnel pour les boutons -->
          <div v-if="slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useSlots } from 'vue'

// Récupère les slots disponibles
const slots = useSlots()

// Props reçues du parent
defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Modal',
  },
})

// Événements émis vers le parent
const emit = defineEmits(['close'])

// Fonction pour fermer la modal
const closeModal = () => {
  emit('close')
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-overlay);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: $spacing-4;
}
.modal-content {
  background-color: var(--modal-bg);
  border-radius: $radius-lg;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--modal-shadow);
  animation: slideUp $transition-slow ease-out;

  @media (max-width: $breakpoint-sm) {
    max-width: 100%;
    max-height: 95vh;
    border-radius: $radius-lg $radius-lg 0 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-5 $spacing-6;
  border-bottom: 1px solid var(--border-light);

  @media (max-width: $breakpoint-sm) {
    padding: $spacing-4;
  }

  h2 {
    margin: 0;
    font-size: $font-size-xl;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);

    @media (max-width: $breakpoint-sm) {
      font-size: $font-size-lg;
    }
  }
}
.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background-color: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: $radius-md;
  transition: all $transition-fast;
  font-size: $font-size-lg;

  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }
}
.modal-body {
  padding: $spacing-6;
  overflow-y: auto;
  @include custom-scrollbar;

  @media (max-width: $breakpoint-sm) {
    padding: $spacing-4;
  }
}
.modal-footer {
  padding: $spacing-4 $spacing-6;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
  gap: $spacing-3;

  @media (max-width: $breakpoint-xs) {
    padding: $spacing-4;
    flex-direction: column;

    :deep(button) {
      width: 100%;
      justify-content: center;
    }
  }
}
// Animations
.modal-enter-active,
.modal-leave-active {
  transition: opacity $transition-base;

  .modal-content {
    transition:
      transform $transition-base,
      opacity $transition-base;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal-content {
    transform: translateY(20px);
    opacity: 0;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
