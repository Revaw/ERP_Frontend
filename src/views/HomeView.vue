<template>
  <div class="page">
    <div class="page__header">
      <h1 class="page__title">Tableau de bord</h1>
      <p class="page__subtitle">Vue d'ensemble de votre activité</p>
    </div>
    <!-- RESUME -->
    <BatteryResume
      :total="total"
      :totalExpediees="totalExpediees"
      :totalSav="totalSav"
      :moisExpediees="moisExpediees"
      :moisCreees="moisCreees"
      :derniereCree="derniereCree"
      @open-mail-modal="openMailModal"
    />
    <!-- NAV -->
    <h2 class="section-title">Accès rapide</h2>
    <div class="quick-nav">
      <!-- Production -->
      <RouterLink to="/allBatteries" class="quick-nav__item">
        <div class="quick-nav__icon">
          <FontAwesomeIcon :icon="['fas', 'car-battery']" />
        </div>
        <span class="quick-nav__label">Production</span>
      </RouterLink>
      <!-- SAV -->
      <RouterLink to="/sav" class="quick-nav__item">
        <div class="quick-nav__icon quick-nav__icon--red">
          <FontAwesomeIcon :icon="['fas', 'heart-pulse']" />
        </div>
        <span class="quick-nav__label">SAV</span>
      </RouterLink>
      <!-- Pièces Détachées -->
      <RouterLink to="/dashboard-spareparts" class="quick-nav__item">
        <div class="quick-nav__icon quick-nav__icon--blue">
          <FontAwesomeIcon :icon="['fas', 'puzzle-piece']" />
        </div>
        <span class="quick-nav__label">Pièces Détachées</span>
      </RouterLink>
      <!-- Devices -->
      <RouterLink to="/devices" class="quick-nav__item">
        <div class="quick-nav__icon quick-nav__icon--green">
          <FontAwesomeIcon :icon="['fas', 'microchip']" />
        </div>
        <span class="quick-nav__label">Devices</span>
      </RouterLink>
      <!-- Modèles & versions (référentiel produit) -->
      <RouterLink to="/admin/modeles" class="quick-nav__item">
        <div class="quick-nav__icon quick-nav__icon--blue">
          <FontAwesomeIcon :icon="['fas', 'tag']" />
        </div>
        <span class="quick-nav__label">Modèles & versions</span>
      </RouterLink>
      <!-- Clients (consultation ouverte à tous, édition superadmin) -->
      <RouterLink to="/admin/clients" class="quick-nav__item">
        <div class="quick-nav__icon quick-nav__icon--green">
          <FontAwesomeIcon :icon="['fas', 'handshake']" />
        </div>
        <span class="quick-nav__label">Clients</span>
      </RouterLink>
      <!-- Statistiques -->
      <RouterLink to="/stats" class="quick-nav__item">
        <div class="quick-nav__icon quick-nav__icon--purple">
          <FontAwesomeIcon :icon="['fas', 'chart-pie']" />
        </div>
        <span class="quick-nav__label">Statistiques</span>
      </RouterLink>
      <!-- Gestion des Administrateurs -->
      <RouterLink v-if="authStore.isSuperAdmin" to="/admin/users" class="quick-nav__item">
        <div class="quick-nav__icon quick-nav__icon--orange">
          <FontAwesomeIcon :icon="['fas', 'users-gear']" />
        </div>
        <span class="quick-nav__label">Utilisateurs</span>
      </RouterLink>
    </div>
    <!-- MODAL MAIL -->
    <Modal :isOpen="isMailModalOpen" title="Mail de fin de mois" @close="closeMailModal">
      <!-- Choix du mois : permet de générer le mail rétroactivement
           (ex: le 1er du mois pour le mois précédent) -->
      <div class="mail-period">
        <label for="mailMonth">Mois du récapitulatif</label>
        <input id="mailMonth" type="month" v-model="selectedMonth" @change="generateMail" />
      </div>
      <pre class="mail-content">{{ mailContent }}</pre>
      <p v-if="copied" class="copied-msg">
        <FontAwesomeIcon :icon="['fas', 'circle-check']" />
        Copié dans le presse-papier
      </p>

      <template #footer>
        <button class="btn-primary" @click="copyToClipboard">
          <FontAwesomeIcon :icon="['fas', 'copy']" />
          Copier
        </button>
        <button class="btn-secondary" @click="closeMailModal">Fermer</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
//store
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast'
// Composants UI
import BatteryResume from '@/components/batteries/BatteryResume.vue'
import Modal from '@/components/ui/Modal.vue'
// Services API & Utilitaires
import { getBatteryStats, getMonthlyExpeditions } from '@/services/batteries.js'
import { formatDate } from '@/utils/formatDate.js'

// Initialisation des stores
const authStore = useAuthStore()
const toast = useToastStore()

const total = ref(0) // Nombre de batteries totales
const totalExpediees = ref(0)
const totalSav = ref(0)
const moisExpediees = ref(0)
const moisCreees = ref(0) //nb (imprimées) durant le mois courant
const derniereCree = ref('')

// Modal
const isMailModalOpen = ref(false) // Etat de l'ouverture de la modal
const mailContent = ref('')
const copied = ref(false) // Etat de la copie dans le presse-papier

// Liste des mois pour le formatage textuel dans le corps du mail
const monthNames = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

// Mois sélectionné pour le récapitulatif, au format "AAAA-MM" (input type=month).
// Permet de générer le mail rétroactivement (ex: le 1er du mois pour le mois d'avant).
const selectedMonth = ref('')

/**
 * @description Génère le contenu du mail pour le mois sélectionné.
 * Appelle l'API avec month/year, formate la liste et construit le template.
 * @returns {Promise<boolean>} true si le contenu a été généré
 */
const generateMail = async () => {
  // Champ vidé au clavier (possible sur input type=month) : on ne régénère
  // pas — sinon le backend retomberait silencieusement sur le mois courant.
  if (!selectedMonth.value) return false
  try {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const data = await getMonthlyExpeditions(month, year)
    const monthName = monthNames[data.month - 1]
    const batteriesList = data.data
      .map((b) => `${b.NumeroSerie}    ${formatDate(b.TimestampExpedition)}`)
      .join('\n')
    mailContent.value = `Bonjour,

Veuillez trouver ci-dessous le récapitulatif des batteries qui ont été expédiées au cours du mois de ${monthName} ${data.year}, soit ${data.total} envois sur la période :

Vous y trouverez les dates de départ ainsi que les numéros de série correspondants pour chaque unité.
${batteriesList}

Bonne réception.

Cordialement, L'équipe REVAW`

    copied.value = false
    return true
  } catch {
    toast.error('Erreur lors de la récupération des données')
    return false
  }
}

/**
 * @description Ouvre la modale du mail, initialisée sur le mois courant.
 * Le sélecteur de mois permet ensuite de changer la période (rétroactif).
 * La modale ne s'ouvre pas si la génération a échoué (pas de mail vide).
 */
const openMailModal = async () => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const ok = await generateMail()
  if (ok) isMailModalOpen.value = true
}

// Ferme la modale
const closeMailModal = () => {
  isMailModalOpen.value = false
}

// Copie le contenu du mail généré dans le presse-papier
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(mailContent.value)
    copied.value = true
  } catch {
    toast.error('Erreur lors de la copie')
  }
}

onMounted(async () => {
  try {
    // Récupération des stats globales
    const stats = await getBatteryStats()
    // Mise à jour des variables réactives
    total.value = stats.total
    totalExpediees.value = stats.totalExpediees
    totalSav.value = stats.totalSav
    moisExpediees.value = stats.moisExpediees
    moisCreees.value = stats.moisCreees
    derniereCree.value = stats.derniereCree
  } catch {
    toast.error('Erreur lors du chargement des statistiques')
  }
})
</script>

<style lang="scss" scoped>
.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
  margin-bottom: $spacing-4;
}

.quick-nav {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: $spacing-4;

  @media (max-width: $breakpoint-xl) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: $breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: $breakpoint-xs) {
    grid-template-columns: 1fr;
  }

  &__item {
    @include card($spacing-5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-3;
    text-decoration: none;
    transition: all $transition-base;

    &:hover {
      transform: translateY(-4px);
      box-shadow: $shadow-lg;
      border-color: var(--revaw-primary);

      .quick-nav__icon {
        transform: scale(1.1);
      }
    }
  }

  &__icon {
    width: 64px;
    height: 64px;
    border-radius: $radius-lg;
    background-color: var(--revaw-primary-light);
    color: var(--revaw-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-2xl;
    transition: transform $transition-base;

    &--red {
      background-color: var(--color-error-bg);
      color: var(--color-error);
    }

    &--blue {
      background-color: var(--color-info-bg);
      color: var(--color-info);
    }

    &--purple {
      background-color: var(--role-superadmin-bg);
      color: var(--role-superadmin-text);
    }

    &--orange {
      background-color: var(--color-warning-bg);
      color: var(--color-warning);
    }

    &--green {
      background-color: var(--color-success-bg);
      color: var(--color-success);
    }
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    text-align: center;
  }
}
.mail-content {
  background-color: var(--bg-secondary);
  padding: $spacing-4;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-family: $font-family-mono;
  line-height: $line-height-relaxed;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  @include custom-scrollbar;

  @media (max-width: $breakpoint-sm) {
    font-size: $font-size-xs;
    max-height: 300px;
  }
}
.copied-msg {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  color: var(--color-success);
  font-weight: $font-weight-medium;
  margin-top: $spacing-3;
  font-size: $font-size-sm;
}

.mail-period {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  margin-bottom: $spacing-3;

  label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
  }

  input[type='month'] {
    padding: $spacing-2 $spacing-3;
    border: 1px solid var(--border-default);
    border-radius: $radius-md;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-size: $font-size-sm;
  }
}
</style>
