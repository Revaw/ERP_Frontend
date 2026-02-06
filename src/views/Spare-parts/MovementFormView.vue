<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Mouvements de stock</h1>
      <p class="page__subtitle">Entrées, sorties et transferts de pièces détachées</p>
    </div>

    <!-- Boutons de choix de mouvement -->
    <div class="mode-selector">
      <!-- Ajouter -->
      <button
        class="mode-btn"
        :class="{ 'mode-btn--active mode-btn--in': mode === 'in' }"
        @click="setMode('in')"
      >
        <div class="mode-btn__icon">
          <FontAwesomeIcon :icon="['fas', 'plus']" />
        </div>
        <span class="mode-btn__label">Ajouter</span>
      </button>
      <!-- Enlever -->
      <button
        class="mode-btn"
        :class="{ 'mode-btn--active mode-btn--out': mode === 'out' }"
        @click="setMode('out')"
      >
        <div class="mode-btn__icon">
          <FontAwesomeIcon :icon="['fas', 'minus']" />
        </div>
        <span class="mode-btn__label">Enlever</span>
      </button>
      <!-- Transfert -->
      <button
        class="mode-btn"
        :class="{ 'mode-btn--active mode-btn--transfer': mode === 'transfer' }"
        @click="setMode('transfer')"
      >
        <div class="mode-btn__icon">
          <FontAwesomeIcon :icon="['fas', 'arrow-right-arrow-left']" />
        </div>
        <span class="mode-btn__label">Transfert</span>
      </button>
    </div>

    <!-- Formulaire -->
    <form v-if="mode" @submit.prevent="handleSubmit" class="form-card">
      <h2 class="form-card__title">
        <FontAwesomeIcon
          :icon="['fas', mode === 'in' ? 'plus' : mode === 'out' ? 'minus' : 'arrow-right-arrow-left']"
        />
        <span v-if="mode === 'in'">Nouvelle Entrée</span>
        <span v-else-if="mode === 'out'">Nouvelle Sortie</span>
        <span v-else>Nouveau Transfert</span>
      </h2>

      <!-- Pièce -->
      <div class="form-group">
        <label>Pièce</label>
        <select v-model="form.sku" required>
          <option value="">-- Choisir une pièce --</option>
          <option v-for="part in spareParts" :key="part.sku" :value="part.sku">
            {{ part.name }} ({{ part.sku }})
          </option>
        </select>
      </div>

      <!-- Emplacement -->
      <div class="form-group" v-if="mode === 'in' || mode === 'out'">
        <label>Emplacement</label>
        <select v-model="form.location" required>
          <option value="">-- Choisir un emplacement --</option>
          <option v-for="loc in locations" :key="loc._id" :value="loc.code">
            {{ loc.code }} ({{ loc.name }})
          </option>
        </select>
      </div>

      <!-- Transfert source et destination -->
      <div class="form-row" v-if="mode === 'transfer'">
        <div class="form-group half">
          <label>De (source)</label>
          <select v-model="form.from_location" required>
            <option value="">-- Source --</option>
            <option v-for="loc in locations" :key="loc._id" :value="loc.code">
              {{ loc.code }}
            </option>
          </select>
        </div>

        <div class="form-group half">
          <label>Vers (destination)</label>
          <select v-model="form.to_location" required>
            <option value="">-- Destination --</option>
            <option
              v-for="loc in locations"
              :key="loc._id"
              :value="loc.code"
              :disabled="loc.code === form.from_location"
            >
              {{ loc.code }}
            </option>
          </select>
        </div>
      </div>

      <!-- Quantité -->
      <div class="form-row">
        <div class="form-group" :class="{ half: mode === 'in' }">
          <label>Quantité</label>
          <input type="number" min="1" v-model.number="form.qty" required placeholder="Ex: 5" />
        </div>
        <!-- Coût total -->
        <div class="form-group half" v-if="mode === 'in'">
          <label>Coût total (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            v-model.number="form.total_cost"
            placeholder="0.00"
          />
        </div>
      </div>

      <!-- Motif -->
      <div class="form-group">
        <label>Motif</label>
        <select v-model="form.reason" required>
          <option v-if="mode === 'in'" value="manual">Entrée ponctuelle / manuelle</option>
          <option v-if="mode === 'out'" value="manual">Sortie ponctuelle / manuelle</option>
          <option v-if="mode === 'transfer'" value="manual">Transfert ponctuel / manuel</option>
          <option v-if="mode === 'out'" value="sav_replacement">Remplacement SAV</option>
          <option value="inventory_adjustment">Ajustement / correctif inventaire</option>
        </select>
      </div>

      <!-- Stock critique, optionnel -->
      <div class="form-group" v-if="mode === 'in' || mode === 'out'">
        <label class="label-badge">
          Stock critique
          <span class="badge">optionnel</span>
        </label>
        <input type="number" min="0" v-model.number="form.criticalStock" />
      </div>

      <!-- Commentaire -->
      <div class="form-group">
        <label>Commentaire</label>
        <textarea v-model="form.comment" rows="2" placeholder="Optionnel..." />
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary btn--full">
          <FontAwesomeIcon :icon="['fas', 'check']" />
          Enregistrer le mouvement
        </button>
      </div>
    </form>

    <!-- Mouvements récents -->
    <section v-if="recentMovements.length" class="recent-section">
      <div class="section-header">
        <h2 class="section-title">
          <FontAwesomeIcon :icon="['fas', 'clock-rotate-left']" />
          Mouvements récents
        </h2>
        <RouterLink to="/stock/movement/list" class="btn-link">
          Voir tout
          <FontAwesomeIcon :icon="['fas', 'angle-right']" />
        </RouterLink>
      </div>

      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Pièce</th>
              <th>Quantité</th>
              <th>Motif</th>
              <th>Date</th>
              <th>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in recentMovements" :key="m._id">
              <!-- sku & nom -->
              <td data-label="Pièce">
                <div class="item-name">{{ m.name }}</div>
                <div class="item-sku">{{ m.sku }}</div>
              </td>
              <!-- quantité -->
              <td data-label="Quantité">
                <span class="qty-badge" :class="m.qty > 0 ? 'qty-badge--in' : 'qty-badge--out'">
                  {{ m.qty > 0 ? '+' : '' }}{{ m.qty }}
                </span>
              </td>
              <!-- motif -->
              <td data-label="Motif">{{ m.reason }}</td>
              <!-- date -->
              <td data-label="Date">{{ formatDate(m.createdAt) }}</td>
              <!-- commentaire -->
              <td data-label="Commentaire" class="comment-cell">{{ m.comment || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
//store
import { useToastStore } from '@/stores/toast'
// Services API
import { getAllSpareParts } from '@/services/spareParts.js'
import { createMovement, getRecentMovements } from '@/services/stock.js'
import { getAllLocations } from '@/services/locations.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'

const toast = useToastStore()

// --- ÉTAT RÉACTIF (DATA) ---
const spareParts = ref([]) // Liste complète des pièces (pour le select SKU)
const locations = ref([]) // Liste des lieux de stockage (pour les select Location)
const recentMovements = ref([]) // Historique immédiat pour feedback utilisateur
const mode = ref(null) // Mode actif du formulaire : 'in', 'out' ou 'transfer'
// Objet Formulaire unique (réinitialisé à chaque changement de mode)
const form = ref({
  sku: '',
  qty: null,
  total_cost: null, // Saisie UX : Coût total (sera converti en unitaire pour le back)
  reason: '',
  comment: '',
  location: '', // Utilisé pour Entrée/Sortie simple
  from_location: '', // Utilisé pour Transfert (Source)
  to_location: '', // Utilisé pour Transfert (Destination)
})

// --- LOGIQUE MÉTIER ---
/**
 * @description Change le type d'opération et réinitialise proprement le formulaire.
 * @param {String} value - 'in' | 'out' | 'transfer'
 */
const setMode = (value) => {
  mode.value = value
  // Reset complet des champs pour éviter les effets de bord
  form.value = {
    sku: '',
    qty: null,
    total_cost: null,
    reason: 'manual', // Valeur par défaut logique pour une saisie manuelle
    comment: '',
    location: '',
    from_location: '',
    to_location: '',
  }
}

/**
 * @description Validation et envoi du mouvement.
 * Gère la conversion "Coût Total -> Prix Unitaire" et le signe de la quantité.
 */
const handleSubmit = async () => {
  try {
    // 1. Validation de la quantité
    if (!form.value.qty || form.value.qty <= 0) {
      return toast.error('Quantité invalide')
    }
    // 2. Gestion du sens du mouvement (Positif ou Négatif)
    // Pour une sortie, on envoie une quantité négative au backend
    let signedQty = form.value.qty
    if (mode.value === 'out') {
      signedQty = -form.value.qty
    }
    // 3. Calcul du Prix Unitaire (Logique UX)
    // L'utilisateur saisit un coût total, le backend attend un prix unitaire.
    let computedUnitPrice = null
    if (mode.value === 'in' && form.value.total_cost != null) {
      // On divise le coût total par la quantité pour obtenir le prix unitaire attendu par le back
      computedUnitPrice = form.value.total_cost / form.value.qty
    }
    // 4. Appel API
    await createMovement({
      ...form.value,
      qty: signedQty,
      unit_price: computedUnitPrice, // Envoi du calculé (peut être null)
      createdBy: 'operator', // TODO: Remplacer par l'ID user réel de l'utilisateur connecté
    })
    // 5. Feedback et Nettoyage
    toast.success('Mouvement enregistré avec succès !')
    setMode(mode.value) // Reset le formulaire en gardant le mode
    await loadRecentMovements()
  } catch (err) {
    toast.error(err.response?.data?.message || err.message)
  }
}

/**
 * @description Récupère les 10 derniers mouvements pour affichage.
 */
const loadRecentMovements = async () => {
  const movements = await getRecentMovements()
  recentMovements.value = movements
}

/**
 * @description Empêche de sélectionner la même destination que la source lors d'un transfert.
 * Si l'utilisateur change la source pour qu'elle soit égale à la destination actuelle,
 * on vide la destination pour forcer une nouvelle saisie.
 */
watch(
  () => form.value.from_location,
  (newVal) => {
    if (newVal && newVal === form.value.to_location) {
      form.value.to_location = ''
    }
  },
)
/**
 * Charge en parallèle les référentiels (Pièces, Lieux) et l'historique.
 */
onMounted(async () => {
  try {
    spareParts.value = await getAllSpareParts()
    await loadRecentMovements()
    locations.value = await getAllLocations()
  } catch {
    toast.error('Erreur lors du chargement des données')
  }
})
</script>

<style lang="scss" scoped>
// Sélecteur de mode
.mode-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-4;
  margin-bottom: $spacing-6;

  @media (max-width: $breakpoint-sm) {
    grid-template-columns: 1fr;
    gap: $spacing-3;
  }
}

.mode-btn {
  @include card($spacing-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  transition: all $transition-base;
  border: 2px solid var(--border-default);

  &:hover {
    border-color: var(--revaw-primary);
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: $radius-lg;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-xl;
    transition: all $transition-base;
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }

  &--active {
    border-color: var(--revaw-primary);
    background-color: var(--revaw-primary-light);

    .mode-btn__icon {
      background-color: var(--revaw-primary);
      color: var(--text-inverse);
    }
  }

  &--in.mode-btn--active {
    border-color: var(--color-success);
    background-color: var(--color-success-bg);

    .mode-btn__icon {
      background-color: var(--color-success);
    }
  }

  &--out.mode-btn--active {
    border-color: var(--color-error);
    background-color: var(--color-error-bg);

    .mode-btn__icon {
      background-color: var(--color-error);
    }
  }

  &--transfer.mode-btn--active {
    border-color: var(--color-info);
    background-color: var(--color-info-bg);

    .mode-btn__icon {
      background-color: var(--color-info);
    }
  }
}

// Formulaire
.form-card {
  @include card;
  margin-bottom: $spacing-8;
  @include slide-up;

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--revaw-primary);
    margin-bottom: $spacing-5;
    padding-bottom: $spacing-4;
    border-bottom: 1px solid var(--border-light);

    svg {
      font-size: $font-size-base;
    }
  }
}

.btn--full {
  width: 100%;
}

// Section mouvements récents
.recent-section {
  margin-top: $spacing-8;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-4;
}

.section-title {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
  margin: 0;

  svg {
    color: var(--revaw-primary);
    font-size: $font-size-base;
  }
}

// Styles du tableau
.item-name {
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
}

.item-sku {
  font-size: $font-size-xs;
  color: var(--text-secondary);
  margin-top: $spacing-1;
}

.qty-badge {
  display: inline-flex;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  min-width: 48px;
  justify-content: center;

  &--in {
    background-color: var(--tag-green-bg);
    color: var(--tag-green-text);
  }

  &--out {
    background-color: var(--tag-red-bg);
    color: var(--tag-red-text);
  }
}

.comment-cell {
  font-style: italic;
  color: var(--text-secondary);
  font-size: $font-size-sm;
}
</style>
