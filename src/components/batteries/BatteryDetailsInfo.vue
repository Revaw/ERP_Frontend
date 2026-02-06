<template>
  <div class="battery-details">
    <div v-if="loading" class="battery-details__loading">
      <Loader />
    </div>
    <div v-else-if="!battery" class="battery-details__error">Erreur : Aucune donnée</div>

    <div v-else class="battery-details__content">
      <!-- Annulation -->
      <CustomBloc v-if="battery.isCanceled" title="Cette batterie a été annulée">
        <div v-if="authStore.isAdmin" class="alert-state alert-state--warning">
          <p>Vous pouvez réintégrer cette batterie si c'était une erreur.</p>
          <button class="btn-primary" @click="toggleCancellation(false)">
            <FontAwesomeIcon :icon="['fas', 'rotate-left']" /> Réintégrer
          </button>
        </div>
      </CustomBloc>

      <!-- Informations générales -->
      <CustomBloc title="Informations générales">
        <div class="details-grid">
          <div class="info-row">
            <span class="info-row__label">Numéro de série</span>
            <span class="info-row__value info-row__value--highlight">{{
              battery.NumeroSerie
            }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Lien passport</span>
            <button @click="openPassport" class="info-row__link">
              <FontAwesomeIcon :icon="['fas', 'eye']" /> Afficher
            </button>
          </div>
          <div class="info-row">
            <span class="info-row__label"
              >Version
              <button
                class="action-icon-btn"
                v-if="authStore.isAdmin"
                @click="openVersionModal"
                title="Modifier la version"
              >
                <font-awesome-icon icon="pen-to-square" /></button
            ></span>

            <span class="info-row__value">{{ battery.version || 'Non renseigné' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Score</span>
            <span class="info-row__value">{{ battery.score || 'Non renseigné' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Source</span>
            <span class="info-row__value">{{ sourceType || 'Non renseigné' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Type</span>
            <span class="info-row__value">{{ battery.type || 'Non renseigné' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Capacité</span>
            <span class="info-row__value">{{ batteryCapacity || 'Non renseigné' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Statut</span>
            <span class="info-row__value">{{ battery.status || 'Non renseigné' }}</span>
          </div>
        </div>
      </CustomBloc>
      <!-- Version history -->
      <CustomBloc
        title="Historique des Versions"
        icon="code-branch"
        class="mt-4"
        v-if="battery.version_history && battery.version_history.length > 0"
      >
        <div class="table-responsive">
          <table class="table custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ancienne</th>
                <th>Nouvelle</th>
                <th>Motif</th>
                <th>Auteur</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, index) in [...battery.version_history].reverse()" :key="index">
                <td>{{ formatDate(log.date) }}</td>
                <td>{{ log.previous_version }}</td>
                <td class="fw-bold">{{ log.new_version }}</td>
                <td>{{ log.reason }}</td>
                <td>{{ log.author || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CustomBloc>
      <!-- Version modal -->
      <Modal :isOpen="isVersionModalOpen" @close="closeVersionModal" title="Modifier la Version">
        <form @submit.prevent="handleUpdateVersion">
          <div class="form-group mb-3">
            <label class="form-label">Nouvelle Version</label>
            <input
              type="text"
              class="form-control"
              v-model="form.newVersion"
              placeholder="Ex: V2.1"
              required
            />
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Motif du changement</label>
            <textarea
              class="form-control"
              rows="3"
              v-model="form.reason"
              placeholder="Pourquoi changez-vous la version ?"
            ></textarea>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" @click="closeVersionModal">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              <span v-if="isSubmitting"
                ><font-awesome-icon icon="spinner" spin /> Enregistrement...</span
              >
              <span v-else>Enregistrer</span>
            </button>
          </div>
        </form>
      </Modal>

      <!-- Dates importantes -->
      <CustomBloc title="Dates importantes">
        <div class="details-grid">
          <div class="info-row">
            <span class="info-row__label">Impression</span>
            <span class="info-row__value">{{ formatDate(battery.TimestampImpression) }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Fin de test</span>
            <span class="info-row__value">{{ formatDate(battery.TimestampTestDone) }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Expédition</span>
            <span class="info-row__value">{{ formatDate(battery.TimestampExpedition) }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Fin de garantie</span>
            <span v-if="battery.isWarrantyRevoked" class="info-row__value info-row__value--error">
              <FontAwesomeIcon :icon="['fas', 'ban']" /> RÉVOQUÉE
            </span>
            <span
              v-else
              class="info-row__value"
              :class="{ 'info-row__value--success': warrantyEndDate !== '-' }"
            >
              {{ warrantyEndDate }}
              <small v-if="warrantyDuration">({{ warrantyDuration }} ans)</small>
            </span>
          </div>
        </div>
      </CustomBloc>

      <!-- Statut SAV -->
      <CustomBloc v-if="hasSav" title="Statut SAV">
        <div class="sav-header">
          <CustomTag :text="displayStatus" :variant="badgeVariant" />
          <button
            v-if="authStore.isAdmin && !isEditingSav"
            class="btn-secondary btn-sm"
            @click="isEditingSav = true"
          >
            <FontAwesomeIcon :icon="['fas', 'pen-to-square']" /> Éditer
          </button>
        </div>

        <BatterySavForm
          v-if="isEditingSav"
          :initialStatus="activeIntervention?.status"
          :initialMotif="activeIntervention?.motif"
          :spareParts="spareParts"
          @save="handleSaveSav"
          @cancel="isEditingSav = false"
        />
      </CustomBloc>

      <!-- Historique SAV -->
      <CustomBloc title="Historique SAV">
        <BatterySavHistory :history="mergedSavHistory" />
      </CustomBloc>

      <!-- Commentaire -->
      <CustomBloc title="Commentaire">
        <BatteryCommentaryForm
          :initialCommentary="battery.commentary"
          :isAdmin="authStore.isAdmin"
          @save="handleSaveCommentary"
        />
      </CustomBloc>

      <!-- Actions Admin -->
      <div v-if="authStore.isAdmin" class="admin-actions">
        <CustomBloc v-if="!battery.isCanceled" title="Actions">
          <button class="btn-danger" @click="toggleCancellation(true)">
            <FontAwesomeIcon :icon="['fas', 'trash']" /> Annuler cette batterie
          </button>
        </CustomBloc>

        <CustomBloc title="Garantie">
          <div v-if="battery.isWarrantyRevoked" class="alert-state alert-state--error">
            <p><strong>La garantie de cette batterie est révoquée.</strong></p>
            <button class="btn-primary" @click="toggleWarrantyRevocation(false)">
              <FontAwesomeIcon :icon="['fas', 'rotate-left']" /> Rétablir la garantie
            </button>
          </div>
          <div v-else>
            <button class="btn-danger" @click="toggleWarrantyRevocation(true)">
              <FontAwesomeIcon :icon="['fas', 'ban']" /> Révoquer la garantie
            </button>
            <p class="text-muted mt-2">Ouverture client, dommage, etc.</p>
          </div>
        </CustomBloc>
      </div>
    </div>
  </div>
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
        {{ confirmConfig.btnText }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { open } from '@tauri-apps/plugin-shell'
//store
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast'
// Services API
import {
  addOrUpdateCommentary,
  updateBatteryCancellation,
  updateWarrantyRevocation,
  updateBatteryVersion,
} from '@/services/batteries'
import { saveIntervention, getActiveIntervention } from '@/services/sav'
import { getAllSpareParts } from '@/services/spareParts'
import { getActiveBOMByType } from '@/services/bom'
// Composants UI
import CustomTag from '../ui/CustomTag.vue'
import CustomBloc from '../ui/CustomBloc.vue'
import Loader from '../ui/Loader.vue'
import BatterySavForm from './BatterySavForm.vue'
import BatterySavHistory from './BatterySavHistory.vue'
import BatteryCommentaryForm from './BatteryCommentaryForm.vue'
import Modal from '../ui/Modal.vue'
// Utilitaires
import { formatDate } from '@/utils/formatDate'
import { getBatteryKwh } from '@/utils/batteryHelpers'

const authStore = useAuthStore() // Initialisation du store
const toast = useToastStore()
const props = defineProps({
  battery: {
    type: Object, // Objet batterie complet
    required: true,
  },
  loading: {
    type: Boolean,
    default: false, // Optionnel, faux par défaut
  },
})
// Événement pour demander au parent de recharger les données (ex: après une modif SAV)
const emit = defineEmits(['refresh'])

const battery = computed(() => props.battery)
const hasSav = computed(() => battery.value?.sav_status === true)

const spareParts = ref([]) // Liste complète du catalogue de pièces (pour le select)
const activeIntervention = ref(null) // Stocke les données techniques (SavIntervention)
const warrantyDuration = ref(null) // Durée de garantie de la batterie en années

const isEditingSav = ref(false)

// --- Logique du Modal d'édition ---
const isVersionModalOpen = ref(false)
const isSubmitting = ref(false)

const form = reactive({
  newVersion: '',
  reason: '',
})
// Calcul de la capacité
const batteryCapacity = computed(() => {
  return getBatteryKwh(battery.value)
})

// --- État pour la modale de confirmation ---
const isConfirmModalOpen = ref(false)
const confirmConfig = ref({
  title: '',
  message: '',
  action: null,
  btnVariant: 'btn-primary',
  btnText: 'Confirmer',
})

/**
 * Ouvre la modale de confirmation avec une configuration spécifique
 */
const openConfirm = (title, message, action, btnVariant = 'btn-primary', btnText = 'Confirmer') => {
  confirmConfig.value = { title, message, action, btnVariant, btnText }
  isConfirmModalOpen.value = true
}

/**
 * Exécute l'action stockée après validation dans la modale
 */
const executeConfirm = async () => {
  if (confirmConfig.value.action) {
    await confirmConfig.value.action()
  }
  isConfirmModalOpen.value = false
}

// --- LOGIQUE GARANTIE ---
/**
 * @description Calcule la date de fin de garantie.
 * Formule : Date d'expédition + Durée garantie (BOM).
 * Retourne '-' si la batterie n'est pas expédiée ou si la BOM n'est pas chargée.
 */
const warrantyEndDate = computed(() => {
  const expDateStr = battery.value?.TimestampExpedition
  const duration = warrantyDuration.value
  if (!expDateStr || !duration) return '-'
  const d = new Date(expDateStr)
  if (isNaN(d.getTime())) return '-'
  d.setFullYear(d.getFullYear() + duration)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
})

// --- LOGIQUE API ---
/**
 * @description Récupère les données "métier" qui ne sont pas dans le flux CSV logistique.
 * 1. L'intervention SAV technique (Motif, Pièces changées, Statut réel).
 * 2. La BOM active pour déterminer la durée de garantie selon le type (A, B...).
 */
const fetchTechnicalDetails = async () => {
  // Pas de requête si pas de numéro de série
  if (!battery.value?.NumeroSerie) return

  try {
    // Charger l'intervention SAV (existant)
    activeIntervention.value = await getActiveIntervention(battery.value.NumeroSerie)
  } catch {
    // Silencieux : pas de toast car donnée secondaire, l'UI reste fonctionnelle
  }

  // Charger la BOM pour avoir la garantie
  if (battery.value?.type) {
    try {
      const bom = await getActiveBOMByType(battery.value.type)
      if (bom && bom.warrantyDuration) {
        warrantyDuration.value = bom.warrantyDuration
      }
    } catch {
      // Silencieux : pas de toast car donnée secondaire, l'UI reste fonctionnelle
    }
  }
}

// Recharger les détails techniques quand la batterie change
watch(() => props.battery, fetchTechnicalDetails, { immediate: true })

// --- LOGIQUE HISTORIQUE SAV (Fusion) ---
/**
 * @description Fusionne deux sources de vérité pour l'historique SAV :
 * 1. Le CSV (Logistique) : Fournit les dates d'arrivée/départ (Fiable).
 * 2. La BDD (Technique) : Fournit le motif, les pièces et le statut technique.
 *
 * Algorithme : On parcourt l'historique CSV et si une date d'arrivée correspond
 * à celle de l'intervention technique active, on enrichit l'objet.
 */
const mergedSavHistory = computed(() => {
  const csvHistory = battery.value?.sav_history || []
  const sortedHistory = [...csvHistory].sort(
    (a, b) => new Date(b.date_arrivee) - new Date(a.date_arrivee),
  )

  return sortedHistory.map((entry) => {
    const isActiveEntry =
      activeIntervention.value &&
      Date.parse(entry.date_arrivee) === Date.parse(activeIntervention.value.linked_date_arrivee)

    if (isActiveEntry) {
      return {
        ...entry,
        status: activeIntervention.value.status,
        motif: activeIntervention.value.motif,
        parts_used: activeIntervention.value.parts_used,
        location: activeIntervention.value.location,
        technical_status: activeIntervention.value.status,
      }
    }
    return entry
  })
})

/**
 * @description Détermine quel statut afficher dans le badge principal.
 * Priorité au statut technique ("Réparée", "En attente").
 */
const displayStatus = computed(() => {
  // 1. Priorité au statut technique s'il existe (ex: "réparée")
  if (activeIntervention.value?.status) return activeIntervention.value.status
  // 2. Sinon statut CSV ("en cours")
  return 'En cours'
})

// Couleur du badge SAV
const badgeVariant = computed(() =>
  displayStatus.value === 'réparée' ? 'green-tag' : 'yellow-tag',
)

// --- HANDLERS ENFANTS ---
/**
 * @description Sauvegarde l'intervention SAV.
 * @param payload
 */
const handleSaveSav = async (payload) => {
  try {
    await saveIntervention(battery.value.NumeroSerie, payload)
    isEditingSav.value = false
    await fetchTechnicalDetails()
    emit('refresh')
  } catch {
    toast.error('Erreur sauvegarde SAV')
  }
}

/**
 * @description Sauvegarde le commentaire de la batterie.
 * @param newText
 */
const handleSaveCommentary = async (newText) => {
  try {
    await addOrUpdateCommentary(battery.value.NumeroSerie, { commentary: newText })
    emit('refresh')
  } catch {
    toast.error('Erreur lors de la sauvegarde du commentaire')
  }
}
/**
 * @description Bascule le statut "Annulé" de la batterie.
 * @param {Boolean} newState - true pour annuler, false pour réintégrer.
 */
const toggleCancellation = (newState) => {
  const title = newState ? 'Annuler la batterie' : 'Réintégrer la batterie'
  const message = newState
    ? `Voulez-vous vraiment annuler la batterie ${battery.value.NumeroSerie} ?`
    : `Voulez-vous réintégrer la batterie ${battery.value.NumeroSerie} dans la production ?`

  const action = async () => {
    try {
      await updateBatteryCancellation(battery.value.NumeroSerie, newState)
      toast.success(newState ? 'Batterie annulée' : 'Batterie réintégrée')
      emit('refresh')
    } catch {
      toast.error("Erreur lors de l'opération")
    }
  }

  openConfirm(
    title,
    message,
    action,
    newState ? 'btn-danger' : 'btn-primary',
    newState ? 'Annuler la batterie' : 'Réintégrer',
  )
}
// --- DATA SOURCE ---
const sourceType = computed(() => {
  const types = {
    A: ' 28.8kwh Alu',
    B: ' 14.4kwh Alu',
    C: ' 14.4kwh Acier',
    D: ' 9.6kwh Alu',
    E: ' 9.6kwh Acier',
  }
  return types[battery.value?.type] || 'Inconnu'
})

const openVersionModal = () => {
  form.newVersion = props.battery.version || '' // Pré-remplir avec la version actuelle
  form.reason = ''
  isVersionModalOpen.value = true
}

const closeVersionModal = () => {
  isVersionModalOpen.value = false
}

const handleUpdateVersion = async () => {
  if (!form.newVersion || !form.reason) {
    toast.error('Veuillez remplir la version et le motif.')
    return
  }

  // Vérif basique pour ne pas envoyer la même version
  if (form.newVersion === props.battery.version) {
    toast.error("La nouvelle version est identique à l'actuelle.")
    return
  }

  try {
    isSubmitting.value = true
    const authorName = authStore.username || 'Utilisateur ERP'
    await updateBatteryVersion(props.battery.NumeroSerie, {
      newVersion: form.newVersion,
      reason: form.reason,
      author: authorName,
    })

    toast.success('Version mise à jour avec succès')
    emit('refresh') // Demande au parent de recharger les données
    closeVersionModal()
  } catch (error) {
    console.error('Erreur update version:', error)
    // Le gestionnaire d'erreur global ou le store toast affichera l'erreur via l'intercepteur axios souvent,
    // sinon on force l'affichage ici :
    toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour')
  } finally {
    isSubmitting.value = false
  }
}
// ouvrir le passport
const openPassport = async () => {
  const url = `https://www.revaw.fr/passport/${battery.value.NumeroSerie}/${battery.value.CodeQr}`
  await open(url)
}

onMounted(async () => {
  try {
    spareParts.value = await getAllSpareParts()
  } catch {
    toast.error('Erreur lors du chargement des pièces')
  }
})

// --- Action Révocation Garantie ---
const toggleWarrantyRevocation = (newState) => {
  const actionText = newState ? 'RÉVOQUER' : 'RÉTABLIR'
  const title = `${actionText} la garantie`
  const message = `Êtes-vous sûr de vouloir ${actionText.toLowerCase()} la garantie de cette batterie ?`

  const action = async () => {
    try {
      await updateWarrantyRevocation(battery.value.NumeroSerie, newState)
      toast.success(newState ? 'Garantie révoquée' : 'Garantie rétablie')
      emit('refresh')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la mise à jour')
    }
  }

  openConfirm(title, message, action, newState ? 'btn-danger' : 'btn-primary', actionText)
}
</script>
<style lang="scss" scoped>
.battery-details {
  display: flex;
  flex-direction: column;
  gap: $spacing-5;

  &__loading,
  &__error {
    padding: $spacing-10;
    text-align: center;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: $spacing-5;
  }
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: $spacing-5;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  &__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  &__value {
    font-size: $font-size-base;
    color: var(--text-primary);

    &--highlight {
      color: var(--revaw-primary);
      font-weight: $font-weight-semibold;
    }

    &--success {
      color: var(--color-success);
    }

    &--error {
      color: var(--color-error);
      font-weight: $font-weight-bold;
    }
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: $spacing-1;
    color: var(--revaw-primary);
    font-weight: $font-weight-medium;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.sav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-4;
}

.alert-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-4;
  border-radius: $radius-md;
  gap: $spacing-4;

  p {
    margin: 0;
  }

  &--warning {
    background-color: var(--color-warning-bg);
    border: 1px solid var(--color-warning);
  }

  &--error {
    background-color: var(--color-error-bg);
    border: 1px solid var(--color-error);

    p {
      color: var(--color-error);
    }
  }

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.admin-actions {
  display: flex;
  flex-direction: column;
  gap: $spacing-5;
}

.text-muted {
  font-size: $font-size-sm;
  color: var(--text-tertiary);
}
</style>
