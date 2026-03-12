<template>
  <div class="page">
    <div class="page__header">
      <h1 class="page__title">Devices</h1>
      <p class="page__subtitle">Devices connectés au broker MQTT</p>
    </div>

    <!-- Actions -->
    <div v-if="devices.length > 0" class="actions-bar">
      <ExportExcelButton
        :fetchFn="fetchForExport"
        filename="devices"
        label="Exporter"
        :columns="exportColumns"
      />
    </div>

    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat-item">
        <FontAwesomeIcon :icon="['fas', 'microchip']" />
        <span class="stat-item__value">{{ devices.length }}</span>
        <span class="stat-item__label">Total</span>
      </div>
      <div class="stat-item">
        <FontAwesomeIcon :icon="['fas', 'circle-check']" />
        <span class="stat-item__value">{{ registeredCount }}</span>
        <span class="stat-item__label">Enregistrés</span>
      </div>
      <div class="stat-item stat-item--warn" v-if="unregisteredCount > 0">
        <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
        <span class="stat-item__value">{{ unregisteredCount }}</span>
        <span class="stat-item__label">Non configurés</span>
      </div>
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
            <th>Statut</th>
            <th>Label</th>
            <th>MAC</th>
            <th>Type</th>
            <th>Client</th>
            <th>Dernière activité</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in devices" :key="device.deviceId">
            <td data-label="Statut">
              <span
                :class="[
                  'status-badge',
                  device.registered ? 'status-badge--ok' : 'status-badge--warn',
                ]"
              >
                {{ device.registered ? 'Configuré' : 'Non configuré' }}
              </span>
            </td>
            <td data-label="Label" class="label-cell">
              {{ device.registry?.label || '—' }}
            </td>
            <td data-label="MAC" class="mac-cell">{{ device.deviceId }}</td>
            <td data-label="Type">{{ device.registry?.type || '—' }}</td>
            <td data-label="Tenant">
              <span v-if="device.registry?.tenantId" class="tenant-tag">
                {{ device.registry.tenantId }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <td data-label="Dernière activité" class="text-muted">
              {{ formatDate(device.receivedAt) }}
            </td>
            <td data-label="Actions" class="actions-cell">
              <template v-if="authStore.isAdmin">
                <button
                  v-if="device.registered"
                  class="btn-icon btn-icon--primary"
                  title="Modifier la configuration"
                  @click="openEdit(device)"
                >
                  <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
                </button>
                <button
                  v-else
                  class="btn-icon btn-icon--warn"
                  title="Configurer ce device"
                  @click="openRegister(device)"
                >
                  <FontAwesomeIcon :icon="['fas', 'gear']" />
                </button>
              </template>
              <span v-else class="text-muted">—</span>
            </td>
          </tr>
          <tr v-if="devices.length === 0">
            <td colspan="7" class="empty-state">Aucun device détecté.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Configurer / Éditer -->
    <Modal
      :isOpen="isModalOpen"
      :title="isEditing ? `Modifier — ${form.mac}` : `Configurer — ${form.mac}`"
      @close="closeModal"
    >
      <form class="device-form" @submit.prevent="saveForm">
        <div class="form-group">
          <label>MAC</label>
          <input :value="form.mac" disabled />
        </div>
        <div class="form-group">
          <label>Type</label>
          <select v-model="form.type" required>
            <option value="multibat">MultiBat</option>
            <option value="heatingPad">Heating Pad</option>
          </select>
        </div>
        <div class="form-group">
          <label>Label</label>
          <input v-model="form.label" placeholder="Ex : MultiBat Entrepôt A" />
        </div>
        <div class="form-group">
          <label>Tenant <span class="form-optional">(optionnel)</span></label>
          <input
            v-model="form.tenantId"
            placeholder="Ex : monabee — laisser vide pour usage interne"
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
          {{ isEditing ? 'Enregistrer' : 'Configurer' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast.js'
import { useAuthStore } from '@/stores/auth.js'
import { getAllDevices, registerDevice, updateDevice } from '@/services/devices.js'
import Modal from '@/components/ui/Modal.vue'
import Loader from '@/components/ui/Loader.vue'
import ExportExcelButton from '@/components/ui/ExportExcelButton.vue'

const toast = useToastStore()
const authStore = useAuthStore()

const devices = ref([])
const loading = ref(false)
const error = ref(null)
const saving = ref(false)

const isModalOpen = ref(false)
const isEditing = ref(false)

const form = ref({ mac: '', type: 'multibat', label: '', tenantId: '', notes: '' })

const registeredCount = computed(() => devices.value.filter((d) => d.registered).length)
const unregisteredCount = computed(() => devices.value.filter((d) => !d.registered).length)

async function load() {
  loading.value = true
  error.value = null
  try {
    devices.value = await getAllDevices()
  } catch (err) {
    error.value = err.response?.data?.message || 'Impossible de charger les devices'
  } finally {
    loading.value = false
  }
}

function openRegister(device) {
  isEditing.value = false
  form.value = { mac: device.deviceId, type: 'multibat', label: '', tenantId: '', notes: '' }
  isModalOpen.value = true
}

function openEdit(device) {
  isEditing.value = true
  form.value = {
    mac: device.deviceId,
    type: device.registry?.type || 'multibat',
    label: device.registry?.label || '',
    tenantId: device.registry?.tenantId || '',
    notes: device.registry?.notes || '',
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
      await registerDevice({ mac: form.value.mac, ...payload })
      toast.success('Device configuré')
    }
    closeModal()
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement")
  } finally {
    saving.value = false
  }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fetchForExport() {
  return Promise.resolve(
    devices.value.map((d) => ({
      mac: d.deviceId,
      statut: d.registered ? 'Configuré' : 'Non configuré',
      label: d.registry?.label || '',
      type: d.registry?.type || '',
      tenant: d.registry?.tenantId || '',
      notes: d.registry?.notes || '',
      derniere_activite: d.receivedAt || '',
    })),
  )
}

const exportColumns = [
  { key: 'mac', label: 'MAC' },
  { key: 'statut', label: 'Statut' },
  { key: 'label', label: 'Label' },
  { key: 'type', label: 'Type' },
  { key: 'tenant', label: 'Client' },
  { key: 'notes', label: 'Notes' },
  { key: 'derniere_activite', label: 'Dernière activité' },
]

onMounted(load)
</script>

<style lang="scss" scoped>
.actions-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $spacing-4;
}

.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-4;
  margin-bottom: $spacing-6;
}

.stat-item {
  @include card($spacing-4);
  display: flex;
  align-items: center;
  gap: $spacing-3;

  svg {
    font-size: $font-size-xl;
    color: var(--revaw-primary);
  }

  &--warn svg {
    color: var(--color-warning);
  }

  &__value {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: var(--text-primary);
  }

  &__label {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
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

.status-badge {
  display: inline-flex;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;

  &--ok {
    background-color: var(--color-success-bg);
    color: var(--color-success);
  }

  &--warn {
    background-color: var(--color-warning-bg);
    color: var(--color-warning);
  }
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

.btn-icon--warn {
  color: var(--color-warning);

  &:hover {
    background-color: var(--color-warning-bg);
  }
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

.form-optional {
  font-size: $font-size-xs;
  color: var(--text-tertiary);
  font-weight: $font-weight-normal;
  margin-left: $spacing-1;
}
</style>
