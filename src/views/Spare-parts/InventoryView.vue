<template>
  <div class="page">
    <div class="page__header">
      <h1 class="page__title">
        <FontAwesomeIcon :icon="['fas', 'clipboard-list']" />
        Inventaire : {{ locationCode }}
      </h1>
      <p class="page__subtitle">Saisissez les quantités réelles pour chaque pièce</p>
    </div>

    <!-- Chargement des données -->
    <div v-if="isLoading" class="loading-state">
      <Loader text="Chargement du stock..." />
    </div>

    <!-- Affichage des lignes d'inventaire -->
    <template v-else>
      <!-- Stats -->
      <div class="stats-bar">
        <div class="stat-item">
          <FontAwesomeIcon :icon="['fas', 'boxes-stacked']" />
          <span class="stat-item__value">{{ inventoryLines.length }}</span>
          <span class="stat-item__label">Références</span>
        </div>
        <div class="stat-item" :class="{ 'stat-item--success': filledCount > 0 }">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          <span class="stat-item__value">{{ filledCount }}</span>
          <span class="stat-item__label">Saisies</span>
        </div>
      </div>

      <!-- Tableau -->
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Pièce / SKU</th>
              <th>Théorique</th>
              <th>Réel (Saisie)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in inventoryLines" :key="line.sku">
              <!-- sku et nom -->
              <td data-label="Pièce">
                <div class="item-name">{{ line.name }}</div>
                <div class="item-sku">{{ line.sku }}</div>
              </td>
              <!-- stock théorique -->
              <td data-label="Stock Théorique">
                <span class="stock-badge">{{ line.theoreticalStock }}</span>
                <span class="unit-label">{{ line.unit }}</span>
              </td>
              <!-- stock réel, saisie par l'utilisateur -->
              <td data-label="Stock Réel">
                <input
                  type="number"
                  v-model="line.actualStock"
                  min="0"
                  class="stock-input"
                  :class="{ 'stock-input--filled': line.actualStock !== '' }"
                  placeholder="—"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Actions -->
    <div class="actions-bar">
      <button class="btn-secondary" @click="router.back()">
        <FontAwesomeIcon :icon="['fas', 'xmark']" />
        Annuler
      </button>
      <button
        class="btn-primary"
        @click="validateInventory"
        :disabled="isSaving"
        :class="{ 'btn-loading': isSaving }"
      >
        <FontAwesomeIcon v-if="!isSaving" :icon="['fas', 'check']" />
        {{ isSaving ? 'Enregistrement...' : "Valider l'inventaire" }}
      </button>
    </div>
    <Modal
      :isOpen="isConfirmModalOpen"
      title="Confirmer l'inventaire"
      @close="isConfirmModalOpen = false"
    >
      <p>
        Voulez-vous vraiment enregistrer ces <strong>{{ pendingChangesCount }}</strong> ajustements
        de stock ?
      </p>
      <p class="text-muted mt-2">
        Cette action créera des mouvements de régularisation et générera un rapport PDF.
      </p>

      <template #footer>
        <button class="btn-secondary" @click="isConfirmModalOpen = false">Annuler</button>
        <button class="btn-primary" @click="confirmValidation">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          Confirmer et Enregistrer
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
//store
import { useToastStore } from '@/stores/toast'
// Services API
import { getFilteredStocks, createMovement } from '@/services/stock'
// Composants UI
import Loader from '@/components/ui/Loader.vue'
import Modal from '@/components/ui/Modal.vue'
// Librairies tierces pour le PDF
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const toast = useToastStore()

// --- ROUTER & CONFIG ---
const route = useRoute()
const router = useRouter()
// Récupération du code emplacement depuis l'URL (ex: /inventory/REVAW)
const locationCode = route.params.location
// --- ÉTAT RÉACTIF (REFS) ---
const isLoading = ref(false) // État de chargement initial (récupération des stocks)
const isSaving = ref(false) // État de chargement pendant la validation (envoi des ajustements)
const inventoryLines = ref([]) // Liste principale des lignes d'inventaire (Théorique + Saisie)

const isConfirmModalOpen = ref(false) // <--- ÉTAT POUR LA MODALE
const pendingChangesCount = ref(0) // <--- POUR AFFICHER LE NB D'ARTICLES DANS LA MODALE

// Nombre de lignes avec une saisie
const filledCount = computed(() => {
  return inventoryLines.value.filter((line) => line.actualStock !== '' && line.actualStock !== null)
    .length
})

// --- LOGIQUE MÉTIER : CHARGEMENT ---
/**
 * @description Charge le stock depuis l'API et initialise le tableau de saisie.
 */
const loadStock = async () => {
  try {
    isLoading.value = true
    const stocks = await getFilteredStocks(locationCode)
    // Transformation des données du stock en lignes d'inventaire
    inventoryLines.value = stocks.map((item) => ({
      sku: item.sku,
      name: item.name,
      theoreticalStock: item.quantity, // Quantité théorique
      actualStock: '', // Quantité saisie
      unit: item.unit || 'piece',
    }))
  } catch (error) {
    console.error('Erreur chargement inventaire', error)
    toast.error('Impossible de charger le stock.')
  } finally {
    isLoading.value = false
  }
}

// --- LOGIQUE MÉTIER : RAPPORT PDF ---
/**
 * @description Génère et télécharge un rapport PDF complet de l'inventaire.
 * Utilise 'jspdf-autotable' pour créer un tableau stylisé avec code couleur pour les écarts.
 * * @param {Array} allLines - La liste complète des lignes d'inventaire
 */
const generateInventoryPdf = (allLines) => {
  // 1. Initialisation du document
  const doc = new jsPDF()
  const dateStr = new Date().toLocaleDateString()
  const timeStr = new Date().toLocaleTimeString()
  // 2. En-tête du document
  doc.setFontSize(18)
  doc.text(`Rapport d'Inventaire Complet : ${locationCode}`, 14, 20)
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Généré le ${dateStr} à ${timeStr}`, 14, 30)
  // 3. Préparation des données du tableau
  const tableBody = allLines.map((line) => {
    const theo = line.theoreticalStock
    let actual
    // Si pas de saisie, on considère par défaut que le stock est juste (actual = theo)
    if (line.actualStock === '' || line.actualStock === null) {
      actual = theo
    } else {
      actual = Number(line.actualStock)
    }
    const diff = actual - theo
    // Formatage de la colonne écart (ex: "+2", "-5", "OK")
    return [
      line.sku,
      line.name,
      theo,
      actual,
      diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`,
    ]
  })
  // 4. Génération du tableau avec styles conditionnels
  autoTable(doc, {
    startY: 40,
    head: [['SKU', 'Désignation', 'Théorique', 'Réel', 'Ecart']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [46, 204, 113] },
    // Hook pour styliser les cellules au moment du rendu
    didParseCell: function (data) {
      // On cible la colonne 4 ("Ecart") du corps du tableau
      if (data.section === 'body' && data.column.index === 4) {
        const valStr = data.cell.raw.toString()
        if (valStr === 'OK') {
          data.cell.styles.textColor = [127, 140, 141] // Gris, pas d'ecart
          data.cell.styles.fontStyle = 'normal'
        } else {
          const val = parseInt(valStr)
          if (val < 0) {
            data.cell.styles.textColor = [231, 76, 60] // Rouge, ecart negatif
            data.cell.styles.fontStyle = 'bold'
          } else if (val > 0) {
            data.cell.styles.textColor = [39, 174, 96] // Vert, ecart positif
            data.cell.styles.fontStyle = 'bold'
          }
        }
      }
    },
  })
  // 5. Sauvegarde du fichier
  const fileName = `Inventaire_${locationCode}_${dateStr.replace(/\//g, '-')}.pdf`
  doc.save(fileName)
}

// --- LOGIQUE MÉTIER : VALIDATION ---
/**
 * @description Prépare la validation : calcule les changements et ouvre la modale.
 */
const validateInventory = () => {
  const changes = inventoryLines.value.filter((line) => {
    if (line.actualStock === '' || line.actualStock === null) return false
    return Number(line.actualStock) !== line.theoreticalStock
  })

  if (changes.length === 0) {
    toast.info('Aucune différence détectée à enregistrer.')
    return
  }

  pendingChangesCount.value = changes.length
  isConfirmModalOpen.value = true
}

/**
 * @description Exécution réelle de la sauvegarde (appelée depuis la modale).
 */
const confirmValidation = async () => {
  isConfirmModalOpen.value = false

  const changes = inventoryLines.value.filter((line) => {
    if (line.actualStock === '' || line.actualStock === null) return false
    return Number(line.actualStock) !== line.theoreticalStock
  })

  try {
    isSaving.value = true
    const promises = changes.map((line) => {
      const diff = Number(line.actualStock) - line.theoreticalStock
      return createMovement({
        sku: line.sku,
        location: locationCode,
        qty: diff,
        reason: 'inventory_adjustment',
        comment: `Inventaire du ${new Date().toLocaleDateString()}`,
        createdBy: 'inventory_app',
      })
    })

    await Promise.all(promises)
    generateInventoryPdf(inventoryLines.value)
    toast.success('Inventaire validé avec succès !')
    router.push('/dashboard-spareparts')
  } catch (error) {
    console.error('Erreur validation inventaire', error)
    toast.error('Une erreur est survenue lors de la sauvegarde.')
  } finally {
    isSaving.value = false
  }
}
onMounted(async () => {
  await loadStock()
})
</script>

<style lang="scss" scoped>
.page__title {
  display: flex;
  align-items: center;
  gap: $spacing-3;

  svg {
    color: var(--revaw-primary);
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-12;
}

// Stats
.stats-bar {
  display: flex;
  gap: $spacing-4;
  margin-bottom: $spacing-6;

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
    gap: $spacing-3;
  }
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

  &--success {
    svg {
      color: var(--color-success);
    }

    .stat-item__value {
      color: var(--color-success);
    }
  }
}

// Tableau
.item-name {
  font-weight: $font-weight-semibold;
  color: var(--revaw-primary);
}

.item-sku {
  font-size: $font-size-xs;
  color: var(--text-secondary);
  margin-top: $spacing-1;
}

.stock-badge {
  display: inline-flex;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.unit-label {
  font-size: $font-size-xs;
  color: var(--text-tertiary);
  margin-left: $spacing-2;
}

.stock-input {
  width: 100px;
  text-align: center;
  padding: $spacing-2 $spacing-3;
  border: 1px solid var(--input-border);
  border-radius: $radius-md;
  font-size: $font-size-sm;
  background-color: var(--input-bg);
  color: var(--text-primary);
  transition: all $transition-base;

  &::placeholder {
    color: var(--text-placeholder);
  }

  &:focus {
    border-color: var(--input-focus-border);
    outline: none;
    box-shadow: 0 0 0 3px var(--input-focus-ring);
  }

  &--filled {
    background-color: var(--color-success-bg);
    border-color: var(--color-success);
    color: var(--color-success);
    font-weight: $font-weight-semibold;
  }

  @media (max-width: $breakpoint-md) {
    width: 100%;
    max-width: 120px;
  }
}

// Actions
.actions-bar {
  @include card;
  display: flex;
  justify-content: flex-end;
  gap: $spacing-3;
  margin-top: $spacing-6;
  position: sticky;
  bottom: $spacing-4;

  @media (max-width: $breakpoint-md) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;

    .btn-primary,
    .btn-secondary {
      flex: 1;
    }
  }
}
</style>
