<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Clients</h1>
        <p class="page__subtitle">Référentiel des distributeurs et de leurs conditions commerciales</p>
      </div>
      <ButtonBack />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="btn-primary" @click="openAddModal">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Créer un client
      </button>
      <label class="checkbox-filter">
        <input type="checkbox" v-model="showInactive" />
        <span>Afficher les clients inactifs</span>
      </label>
    </div>

    <!-- Tableau -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Slug</th>
            <th>Nom</th>
            <th>Modèles</th>
            <th>Statut</th>
            <th>Créé le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filteredClients" :key="client.slug">
            <td data-label="Slug">
              <span class="slug-badge">{{ client.slug }}</span>
            </td>
            <td data-label="Nom">{{ client.nom }}</td>
            <td data-label="Modèles">
              <span class="count-badge">{{ client.modeles.length }}</span>
            </td>
            <td data-label="Statut">
              <span
                :class="[
                  'status-badge',
                  client.isActive ? 'status-badge--active' : 'status-badge--inactive',
                ]"
              >
                {{ client.isActive ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td data-label="Créé le">{{ formatDate(client.createdAt) }}</td>
            <td data-label="Actions">
              <RouterLink :to="`/admin/clients/${client.slug}`" class="btn-secondary btn--sm">
                <FontAwesomeIcon :icon="['fas', 'eye']" />
                Fiche
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="filteredClients.length === 0" class="empty-state">Aucun client.</p>
    </div>

    <!-- Modal création -->
    <Modal :isOpen="isModalOpen" title="Créer un client" @close="closeModal">
      <form @submit.prevent="saveForm" class="modal-form">
        <div class="form-group">
          <label for="slug">Slug (identifiant technique)</label>
          <input
            id="slug"
            type="text"
            v-model="form.slug"
            @input="normalizeSlug"
            placeholder="ex: monabee"
            pattern="[a-z0-9-]+"
            required
          />
          <small class="form-hint">
            Minuscules, chiffres et tirets. <strong>Définitif après création</strong> : c'est la
            clé qui relie batteries, comptes et devices à ce client — elle doit être identique
            au nom utilisé dans la liste clients de l'interface de production.
          </small>
        </div>

        <div class="form-group">
          <label for="nom">Nom d'affichage</label>
          <input id="nom" type="text" v-model="form.nom" placeholder="ex: Monabee SAS" required />
        </div>
      </form>

      <template #footer>
        <button class="btn-secondary" @click="closeModal">Annuler</button>
        <button class="btn-primary" @click="saveForm">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          Créer
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
//store
import { useToastStore } from '@/stores/toast'
// Services API
import { getAllClients, createClient } from '@/services/clients.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Modal from '@/components/ui/Modal.vue'

const toast = useToastStore()

// --- ÉTAT ---
const clients = ref([])
const showInactive = ref(false)
const isModalOpen = ref(false)
const form = ref({ slug: '', nom: '' })

const filteredClients = computed(() =>
  showInactive.value ? clients.value : clients.value.filter((c) => c.isActive),
)

// --- ACTIONS UI ---
const openAddModal = () => {
  form.value = { slug: '', nom: '' }
  isModalOpen.value = true
}
const closeModal = () => {
  isModalOpen.value = false
}

// Force minuscules + caractères autorisés pendant la saisie
const normalizeSlug = () => {
  form.value.slug = form.value.slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

// --- LOGIQUE MÉTIER ---
const loadClients = async () => {
  try {
    clients.value = await getAllClients()
  } catch {
    toast.error('Erreur chargement clients')
  }
}

const saveForm = async () => {
  try {
    const created = await createClient(form.value)
    toast.success(`Client "${created.slug}" créé`)
    closeModal()
    await loadClients()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur création client')
  }
}

onMounted(loadClients)
</script>

<style lang="scss" scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: $spacing-6;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $spacing-4;
    margin-bottom: $spacing-6;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: var(--text-primary);
    margin: 0;
  }

  &__subtitle {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    margin: $spacing-1 0 0 0;
  }
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: $spacing-4;
  margin-bottom: $spacing-5;
}

.checkbox-filter {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  font-size: $font-size-sm;
  color: var(--text-secondary);

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--revaw-primary);
  }
}

.table-wrapper {
  @include card;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: $spacing-3 $spacing-4;
    text-align: left;
    border-bottom: 1px solid var(--border-light);
  }

  th {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
  }

  td {
    font-size: $font-size-sm;
    color: var(--text-primary);
  }

  tbody tr:hover {
    background-color: var(--bg-secondary);
  }
}

.slug-badge {
  font-family: monospace;
  font-weight: $font-weight-semibold;
  color: var(--revaw-primary);
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 $spacing-2;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
}

.status-badge {
  display: inline-block;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;

  &--active {
    background-color: var(--color-success-bg);
    color: var(--color-success);
  }

  &--inactive {
    background-color: var(--bg-tertiary);
    color: var(--text-tertiary);
  }
}

.btn--sm {
  padding: $spacing-2 $spacing-3;
  font-size: $font-size-sm;
}

.empty-state {
  padding: $spacing-5;
  text-align: center;
  color: var(--text-secondary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.form-hint {
  display: block;
  margin-top: $spacing-1;
  font-size: $font-size-xs;
  color: var(--text-secondary);
  line-height: 1.4;
}
</style>
