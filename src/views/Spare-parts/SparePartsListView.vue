<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Pièces détachées</h1>
      <p class="page__subtitle">Catalogue des références disponibles</p>
    </div>

    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat-item">
        <FontAwesomeIcon :icon="['fas', 'puzzle-piece']" />
        <span class="stat-item__value">{{ spareParts.length }}</span>
        <span class="stat-item__label">Références</span>
      </div>
    </div>

    <!-- Boutons haut -->
    <div v-if="authStore.isAdmin" class="actions-header">
      <button class="btn-secondary" @click="openArchiveModal">
        <FontAwesomeIcon :icon="['fas', 'box-archive']" />
        Archives
      </button>
      <button class="btn-primary" @click="openAddModal">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Ajouter une pièce
      </button>
    </div>

    <!-- Tableau des pièces -->
    <div class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nom</th>
            <th>Fournisseur</th>
            <th>Unité</th>
            <th>Délai (j)</th>
            <th>Dernier prix</th>
            <th v-if="authStore.isAdmin">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="part in spareParts" :key="part.sku">
            <!-- sku -->
            <td data-label="SKU" class="sku-cell">{{ part.sku }}</td>
            <!-- nom -->
            <td data-label="Nom" class="name-cell">{{ part.name }}</td>
            <!-- fournisseur -->
            <td data-label="Fournisseur">
              <a
                v-if="part.supplier_url"
                :href="part.supplier_url"
                target="_blank"
                class="supplier-link"
              >
                {{ part.supplier }}
                <FontAwesomeIcon :icon="['fas', 'arrow-up-right-from-square']" />
              </a>
              <span v-else class="text-muted">{{ part.supplier || '-' }}</span>
            </td>
            <!-- unité -->
            <td data-label="Unité">{{ part.unit }}</td>
            <!-- délai -->
            <td data-label="Délai">
              <span v-if="part.delivery_delay">{{ part.delivery_delay }} j</span>
              <span v-else class="text-muted">-</span>
            </td>
            <!-- dernier prix -->
            <td data-label="Dernier prix">
              <span v-if="part.last_unit_price != null" class="price-tag">
                {{ part.last_unit_price }} €
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <!-- actions -->
            <td v-if="authStore.isAdmin" data-label="Actions" class="actions-cell">
              <button class="btn-icon btn-icon--primary" @click="openEditModal(part)">
                <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bouton ajout et archive de piece inactive -->
    <div v-if="authStore.isAdmin" class="actions-footer">
      <button class="btn-secondary" @click="openArchiveModal">
        <FontAwesomeIcon :icon="['fas', 'box-archive']" />
        Archives
      </button>
      <button class="btn-primary" @click="openAddModal">
        <FontAwesomeIcon :icon="['fas', 'plus']" />
        Ajouter une pièce
      </button>
    </div>
    <!-- Modal Archive -->
    <Modal :isOpen="isArchiveModalOpen" title="Pièces désactivées" @close="closeArchiveModal">
      <div v-if="inactiveParts.length === 0" class="empty-state">
        <p>Aucune pièce dans les archives.</p>
      </div>

      <div v-else class="table-wrapper">
        <table class="custom-table custom-table--compact">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nom</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="part in inactiveParts" :key="part.sku">
              <td class="sku-cell">{{ part.sku }}</td>
              <td class="name-cell">{{ part.name }}</td>
              <td class="actions-cell">
                <button
                  class="btn-icon btn-icon--primary"
                  @click="handleReactivate(part)"
                  title="Réactiver la pièce"
                >
                  <FontAwesomeIcon :icon="['fas', 'rotate-left']" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <button class="btn-secondary" @click="closeArchiveModal">Fermer</button>
      </template>
    </Modal>

    <!-- Modal Ajout -->
    <Modal
      :isOpen="isModalOpen"
      :title="isEditing ? 'Modifier la pièce' : 'Ajouter une pièce'"
      @close="closeModal"
    >
      <!-- Formulaire -->
      <form @submit.prevent="saveForm">
        <div class="form-group">
          <!-- SKU -->
          <label>SKU</label>
          <input v-model="form.sku" :disabled="isEditing" required placeholder="EX: VIS-001" />
        </div>
        <!-- Nom -->
        <div class="form-group">
          <label>Nom</label>
          <input v-model="form.name" required placeholder="Vis M4x10" />
        </div>
        <!-- Fournisseur et unité -->
        <div class="form-row">
          <div class="form-group half">
            <label>Fournisseur</label>
            <input v-model="form.supplier" placeholder="Nom du fournisseur" />
          </div>
          <div class="form-group half">
            <label>Unité</label>
            <input v-model="form.unit" placeholder="pièce, mètre..." />
          </div>
        </div>
        <!-- Lien fournisseur -->
        <div class="form-group">
          <label>Lien fournisseur</label>
          <input v-model="form.supplier_url" type="url" placeholder="https://..." />
        </div>
        <!-- Délai -->
        <div class="form-group">
          <label>Délai de livraison (jours)</label>
          <input type="number" v-model="form.delivery_delay" min="0" />
        </div>
      </form>
      <!-- Désactivation -->
      <div v-if="isEditing">
        <button class="btn-danger btn--full" type="button" @click="handleDeactivate(form)">
          <FontAwesomeIcon :icon="['fas', 'trash']" /> Supprimer cette pièce
        </button>
      </div>
      <!-- Actions -->
      <template #footer>
        <button class="btn-secondary" @click="closeModal">Annuler</button>
        <button class="btn-primary" @click="saveForm">
          <FontAwesomeIcon :icon="['fas', isEditing ? 'check' : 'plus']" />
          {{ isEditing ? 'Enregistrer' : 'Ajouter' }}
        </button>
      </template>
    </Modal>
    <Modal
      :isOpen="isConfirmModalOpen"
      :title="confirmConfig.title"
      @close="isConfirmModalOpen = false"
    >
      <p>{{ confirmConfig.message }}</p>

      <template #footer>
        <button class="btn-secondary" @click="isConfirmModalOpen = false">Annuler</button>
        <button :class="confirmConfig.btnVariant" @click="executeConfirm">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          Confirmer
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'
// Services API
import {
  createSparePart,
  updateSparePart,
  deleteSparePart,
  getInactiveSpareParts,
  reactivateSparePart,
} from '@/services/spareParts.js'
import { getAllSparePartWithStock } from '@/services/stock'
// Composants UI
import Modal from '@/components/ui/Modal.vue'
import ButtonBack from '@/components/ui/ButtonBack.vue'

const authStore = useAuthStore()
const toast = useToastStore()
// --- ÉTAT ---
const spareParts = ref([]) // Liste complète des pièces
const isModalOpen = ref(false) // Etat de l'affichage du modal
const isEditing = ref(false) // Mode de la modale : false = Création, true = Édition
// Objet formulaire réactif pour la modale
const form = ref({
  sku: '',
  name: '',
  supplier: '',
  supplier_url: '',
  unit: 'piece',
  delivery_delay: 0,
})

// --- ÉTAT CONFIRMATION ---
const isConfirmModalOpen = ref(false)
const confirmConfig = ref({
  title: '',
  message: '',
  action: null,
  btnVariant: 'btn-primary',
})

/**
 * Ouvre la modale de confirmation
 */
const openConfirm = (title, message, action, btnVariant = 'btn-primary') => {
  confirmConfig.value = { title, message, action, btnVariant }
  isConfirmModalOpen.value = true
}

/**
 * Exécute l'action validée
 */
const executeConfirm = async () => {
  if (confirmConfig.value.action) {
    await confirmConfig.value.action()
  }
  isConfirmModalOpen.value = false
}

/**
 * Prépare la désactivation (remplace l'ancien handleDeactivate)
 */
const handleDeactivate = (part) => {
  openConfirm(
    'Désactiver la pièce',
    `Voulez-vous vraiment désactiver la pièce "${part.name}" (${part.sku}) ?`,
    async () => {
      try {
        await deleteSparePart(part.sku)
        toast.success('Pièce désactivée avec succès')
        closeModal()
        await loadParts()
      } catch (err) {
        toast.error(err.response?.data?.message || 'Erreur lors de la désactivation')
      }
    },
    'btn-danger',
  )
}

/**
 * Prépare la réactivation (remplace l'ancien handleReactivate)
 */
const handleReactivate = (part) => {
  openConfirm('Réactiver la pièce', `Réactiver la pièce "${part.name}" ?`, async () => {
    try {
      await reactivateSparePart(part.sku)
      toast.success('Pièce réactivée avec succès')
      inactiveParts.value = await getInactiveSpareParts()
      await loadParts()
      if (inactiveParts.value.length === 0) closeArchiveModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la réactivation')
    }
  })
}
// --- LOGIQUE ARCHIVES ---
const isArchiveModalOpen = ref(false)
const inactiveParts = ref([])

// --- LOGIQUE MÉTIER ---
/**
 * @description Charge le catalogue.
 * Utilise un endpoint spécifique 'WithStock' pour afficher non seulement les infos de la pièce,
 * mais aussi une vision consolidée du stock ou du dernier prix connu si disponible.
 */
const loadParts = async () => {
  spareParts.value = await getAllSparePartWithStock()
}
// --- GESTION DE LA MODALE ---
/**
 * @description Ouvre la modale en mode "Création" avec un formulaire vierge.
 */
const openAddModal = () => {
  isEditing.value = false
  // Reset complet du formulaire
  form.value = {
    sku: '',
    name: '',
    supplier: '',
    unit: 'piece',
    delivery_delay: 0,
    supplier_url: '',
  }
  isModalOpen.value = true
}
/**
 * @description Ouvre la modale en mode "Édition" pré-remplie avec les données de la pièce cible.
 * @param {Object} part - L'objet pièce à modifier
 */
const openEditModal = (part) => {
  isEditing.value = true
  // Copie des valeurs pour ne pas modifier la liste en direct avant validation
  form.value = { ...part }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

/**
 * @description Soumet le formulaire
 * Détecte automatiquement s'il faut Créer (POST) ou Mettre à jour (PUT) selon le mode.
 */
const saveForm = async () => {
  // Regex : ^ (début) [a-zA-Z0-9-] (lettres, chiffres, tirets uniquement) + (un ou plusieurs) $ (fin)
  const skuRegex = /^[a-zA-Z0-9-]+$/

  if (!skuRegex.test(form.value.sku)) {
    toast.error(
      'Format SKU invalide. Utilisez uniquement des lettres, des chiffres et des tirets (-). Les espaces et caractères spéciaux sont interdits.',
    )
    return // On arrête tout, rien n'est envoyé au serveur
  }

  try {
    if (isEditing.value) {
      // Mode Édition : Mise à jour par SKU
      await updateSparePart(form.value.sku, form.value)
      toast.success('Pièce modifiée avec succès')
    } else {
      // Mode Création : Nouvelle pièce
      await createSparePart(form.value)
      toast.success('Pièce créée avec succès')
    }
    // Rafraîchissement de la liste et fermeture
    await loadParts()
    closeModal()
  } catch (err) {
    toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement")
  }
}

/**
 * @description Ouvre la modale et charge les pièces inactives
 */
const openArchiveModal = async () => {
  try {
    inactiveParts.value = await getInactiveSpareParts()
    isArchiveModalOpen.value = true
  } catch {
    toast.error('Impossible de charger les archives')
  }
}

const closeArchiveModal = () => {
  isArchiveModalOpen.value = false
}

onMounted(loadParts)
</script>

<style lang="scss" scoped>
.stats-bar {
  display: flex;
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

// Styles tableau
.sku-cell {
  font-family: $font-family-mono;
  font-weight: $font-weight-semibold;
  color: var(--text-secondary);
  font-size: $font-size-sm;
}

.name-cell {
  font-weight: $font-weight-semibold;
  color: var(--revaw-primary);
}

.supplier-link {
  display: inline-flex;
  align-items: center;
  gap: $spacing-1;
  color: var(--color-info);
  text-decoration: none;
  font-weight: $font-weight-medium;
  transition: opacity $transition-fast;

  svg {
    font-size: $font-size-xs;
  }

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
}

.text-muted {
  color: var(--text-tertiary);
}

.price-tag {
  display: inline-flex;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-md;
  font-weight: $font-weight-semibold;
  font-size: $font-size-sm;
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

// Actions header
.actions-header {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-2;
  margin-bottom: $spacing-4;

  @media (max-width: $breakpoint-md) {
    display: none; // Masquer en mobile car le footer est sticky
  }
}

// Actions footer
.actions-footer {
  margin-top: $spacing-6;
  display: flex;
  justify-content: flex-end;

  button {
    margin-left: $spacing-2;
  }

  @media (max-width: $breakpoint-md) {
    position: fixed;
    bottom: $spacing-5;
    right: $spacing-5;
    z-index: 99;

    .btn-primary {
      border-radius: $radius-full;
      padding: $spacing-3 $spacing-5;
      box-shadow: $shadow-lg;
    }
  }
}
</style>
