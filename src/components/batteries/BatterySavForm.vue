<template>
  <div class="sav-form">
    <!-- Statut -->
    <div class="form-group">
      <label for="status">Statut</label>
      <select id="status" v-model="form.status">
        <option value="en cours">En cours</option>
        <option value="réparée">Réparée</option>
      </select>
    </div>

    <!-- Motif -->
    <div class="form-group">
      <label for="motif">Motif SAV</label>
      <textarea id="motif" v-model="form.motif" rows="3" placeholder="Description du problème..." />
    </div>

    <!-- Pièces utilisées -->
    <div class="form-group">
      <label>Pièces utilisées</label>
      <div class="parts-editor">
        <div v-for="(p, index) in savParts" :key="p._tempId" class="part-line">
          <select v-model="p.sku" required>
            <option value="">-- Sélectionner une pièce --</option>
            <option v-for="part in spareParts" :key="part.sku" :value="part.sku">
              {{ part.name }} ({{ part.sku }})
            </option>
          </select>
          <input
            type="number"
            min="1"
            v-model.number="p.qty"
            placeholder="Qté"
            class="part-line__qty"
          />
          <button type="button" class="btn-icon btn-icon--danger" @click="removePartLine(index)">
            <FontAwesomeIcon :icon="['fas', 'xmark']" />
          </button>
        </div>

        <button type="button" class="btn-add" @click="addPartLine">
          <FontAwesomeIcon :icon="['fas', 'plus']" />
          Ajouter une pièce
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button class="btn-secondary" @click="$emit('cancel')">Annuler</button>
      <button class="btn-primary" @click="handleSubmit">
        <FontAwesomeIcon :icon="['fas', 'check']" />
        Enregistrer
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  initialStatus: {
    type: String,
    default: 'en cours',
  },
  initialMotif: {
    type: String,
    default: '',
  },
  spareParts: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['save', 'cancel'])

const form = ref({
  status: 'en cours',
  motif: '',
})

const savParts = ref([{ _tempId: Date.now(), sku: '', qty: 1 }])

const addPartLine = () => {
  savParts.value.push({ _tempId: Date.now(), sku: '', qty: 1 })
}

const removePartLine = (index) => {
  savParts.value.splice(index, 1)
}

const handleSubmit = () => {
  // Nettoyage des pièces vides
  const partsToAdd = savParts.value.filter((p) => p.sku && p.qty > 0)

  emit('save', {
    status: form.value.status,
    motif: form.value.motif,
    parts: partsToAdd,
  })
}

onMounted(() => {
  if (props.initialStatus) form.value.status = props.initialStatus
  if (props.initialMotif) form.value.motif = props.initialMotif
})
</script>

<style lang="scss" scoped>
.sav-form {
  margin-top: $spacing-5;
  padding: $spacing-5;
  border-radius: $radius-lg;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-default);
}

.parts-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.part-line {
  display: flex;
  gap: $spacing-3;
  align-items: center;

  select {
    flex: 1;
  }

  &__qty {
    width: 80px;
    text-align: center;
  }

  @media (max-width: $breakpoint-sm) {
    flex-wrap: wrap;

    select {
      width: 100%;
    }

    &__qty {
      flex: 1;
    }
  }
}

.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-2;
  width: 100%;
  padding: $spacing-3;
  background-color: transparent;
  border: 1px dashed var(--border-default);
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    border-color: var(--revaw-primary);
    color: var(--revaw-primary);
    background-color: var(--revaw-primary-light);
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-3;
  margin-top: $spacing-5;
  padding-top: $spacing-4;
  border-top: 1px solid var(--border-light);
}
</style>
