<template>
  <div class="commentary">
    <!-- Affichage -->
    <div v-if="!isEditing" class="commentary__display">
      <p v-if="currentCommentary" class="commentary__text">{{ currentCommentary }}</p>
      <p v-else class="commentary__empty">Aucun commentaire</p>

      <button v-if="isAdmin" class="btn-secondary btn--sm" @click="startEdit">
        <FontAwesomeIcon :icon="['fas', currentCommentary ? 'pen-to-square' : 'plus']" />
        {{ currentCommentary ? 'Modifier' : 'Ajouter' }}
      </button>
    </div>

    <!-- Formulaire d'édition -->
    <div v-else class="commentary__form">
      <textarea
        v-model="formValue"
        rows="5"
        placeholder="Saisissez votre commentaire..."
        autofocus
      />
      <div class="commentary__actions">
        <button class="btn-secondary" @click="cancelEdit">Annuler</button>
        <button class="btn-primary" @click="save">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          Enregistrer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  initialCommentary: {
    type: String,
    default: '',
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save'])

const isEditing = ref(false)
const currentCommentary = ref(props.initialCommentary || '')
const formValue = ref('')

watch(
  () => props.initialCommentary,
  (val) => {
    currentCommentary.value = val
  },
)

const startEdit = () => {
  formValue.value = currentCommentary.value
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
}

const save = () => {
  emit('save', formValue.value)
  isEditing.value = false
}
</script>

<style lang="scss" scoped>
.commentary {
  &__display {
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
    align-items: flex-start;
  }

  &__text {
    white-space: pre-wrap;
    line-height: $line-height-relaxed;
    color: var(--text-primary);
    margin: 0;
  }

  &__empty {
    color: var(--text-tertiary);
    font-style: italic;
    margin: 0;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;

    textarea {
      width: 100%;
      padding: $spacing-3;
      border: 1px solid var(--input-border);
      border-radius: $radius-md;
      font-size: $font-size-sm;
      line-height: $line-height-relaxed;
      background-color: var(--input-bg);
      color: var(--text-primary);
      resize: vertical;
      transition: border-color $transition-base;

      &:focus {
        border-color: var(--input-focus-border);
        outline: none;
        box-shadow: 0 0 0 3px var(--input-focus-ring);
      }

      &::placeholder {
        color: var(--text-placeholder);
      }
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-3;
  }
}

.btn--sm {
  padding: $spacing-2 $spacing-3;
  font-size: $font-size-sm;
}
</style>
