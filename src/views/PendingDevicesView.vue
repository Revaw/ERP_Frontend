<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Devices en attente</h1>
      <p class="page__subtitle">Pré-enregistrés dans l'ERP, pas encore connectés au broker</p>
    </div>

    <div class="actions-bar">
      <button class="btn-primary" @click="openCreate">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Ajouter un device
      </button>
    </div>

    <!-- Loader / Erreur -->
    <div v-if="loading" class="loading-state">
      <Loader />
    </div>
    <div v-else-if="error" class="error-state">
      <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
      <p>{{ error }}</p>
      <button class="btn-secondary" @click="load">Réessayer</button>
    </div>

    <!-- Tableau -->
    <div v-else class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th>MAC</th>
            <th>Type</th>
            <th>Label</th>
            <th>Client</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in devices" :key="device._id">
            <td data-label="MAC" class="mac-cell">{{ device.mac }}</td>
            <td data-label="Type">{{ device.type }}</td>
            <td data-label="Label" class="label-cell">{{ device.label || '—' }}</td>
            <td data-label="Client">
              <span v-if="device.tenantId" class="tenant-tag">{{ device.tenantId }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td data-label="Notes" class="text-muted">{{ device.notes || '—' }}</td>
            <td data-label="Actions" class="actions-cell">
              <button
                class="btn-icon btn-icon--primary"
                title="Modifier"
                @click="openEdit(device)"
              >
                <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
              </button>
            </td>
          </tr>
          <tr v-if="devices.length === 0">
            <td colspan="6" class="empty-state">Aucun device en attente.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Ajouter / Modifier -->
    <Modal
      :isOpen="isModalOpen"
      :title="isEditing ? `Modifier — ${form.mac}` : 'Ajouter un device'"
      @close="closeModal"
    >
      <form class="device-form" @submit.prevent="saveForm">
        <div class="form-group">
          <label>MAC <span class="form-required">*</span></label>
          <input
            v-model="form.mac"
            :disabled="isEditing"
            placeholder="Ex : AA:BB:CC:DD:EE:FF"
            required
          />
        </div>
        <div class="form-group">
          <label>Type <span class="form-required">*</span></label>
          <select v-model="form.type" required>
            <option value="multibat">MultiBat</option>
            <option value="heatingPad">Heating Pad</option>
          </select>
        </div>
        <div class="form-group">
          <label>Label</label>
          <input v-model="form.label" placeholder="Ex : MultiBat Monabee #3" />
        </div>
        <div class="form-group">
          <label>Client (tenant)</label>
          <input
            v-model="form.tenantId"
            placeholder="Ex : monabee — laisser vide si inconnu"
          />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea v-model="form.notes" rows="2" placeholder="Commentaire libre…" />
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="closeModal">Annuler</button>
        <button class="btn-primary" :disabled="saving" @click="saveForm">
          <FontAwesomeIcon :icon="['fas', saving ? 'spinner' : 'check']" :spin="saving" />
          {{ isEditing ? 'Enregistrer' : 'Ajouter' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast.js'
import { getPendingDevices, createPendingDevice, updateDevice } from '@/services/devices.js'
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'
import Modal from '@/components/ui/Modal.vue'

const toast = useToastStore()

const devices = ref([])
const loading = ref(false)
const error = ref(null)
const saving = ref(false)

const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({ mac: '', type: 'multibat', label: '', tenantId: '', notes: '' })

async function load() {
  loading.value = true
  error.value = null
  try {
    devices.value = await getPendingDevices()
  } catch (err) {
    error.value = err.response?.data?.message || 'Impossible de charger les devices en attente'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isEditing.value = false
  form.value = { mac: '', type: 'multibat', label: '', tenantId: '', notes: '' }
  isModalOpen.value = true
}

function openEdit(device) {
  isEditing.value = true
  form.value = {
    mac: device.mac,
    type: device.type || 'multibat',
    label: device.label || '',
    tenantId: device.tenantId || '',
    notes: device.notes || '',
  }
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

async function saveForm() {
  saving.value = true
  try {
    const payload = {
      type: form.value.type,
      label: form.value.label,
      tenantId: form.value.tenantId || null,
      notes: form.value.notes,
    }
    if (isEditing.value) {
      await updateDevice(form.value.mac, payload)
      toast.success('Device mis à jour')
    } else {
      await createPendingDevice({ mac: form.value.mac, ...payload })
      toast.success('Device ajouté')
    }
    closeModal()
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement")
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.actions-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $spacing-4;
}

.mac-cell {
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  color: var(--text-secondary);
}

.label-cell {
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-tertiary);
  font-size: $font-size-sm;
}

.tenant-tag {
  display: inline-flex;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-md;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.form-required {
  color: var(--color-danger);
  margin-left: 2px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-10 0;
  color: var(--text-secondary);
}

.device-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  textarea {
    resize: vertical;
  }
}
</style>
