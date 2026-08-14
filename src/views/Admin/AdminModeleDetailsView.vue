<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Fiche modèle</h1>
        <p class="page__subtitle">Données du passeport batterie UE 2023/1542</p>
      </div>
      <ButtonBack />
    </div>

    <div v-if="modele" class="modele-card">
      <!-- En-tête -->
      <div class="modele-header">
        <div class="modele-header__left">
          <h2 class="modele-header__title">
            <span class="modele-nom">{{ modele.nom }}</span>
            <FontAwesomeIcon
              :icon="['fas', 'lock']"
              class="lock-icon"
              title="Le nom est définitif (clé d'association des batteries)"
            />
          </h2>
          <span
            :class="[
              'status-badge',
              modele.isActive ? 'status-badge--active' : 'status-badge--inactive',
            ]"
          >
            {{ modele.isActive ? 'Actif' : 'Inactif' }}
          </span>
        </div>
        <div class="modele-header__right">
          <div class="meta-item">
            <span class="meta-item__label">Créé le</span>
            <span class="meta-item__value meta-item__value--date">
              {{ formatDate(modele.createdAt) }}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">Dernière modification</span>
            <span class="meta-item__value meta-item__value--date">
              {{ formatDate(modele.updatedAt) }}
            </span>
          </div>
          <div class="meta-item">
            <button v-if="!isEditing && modele.isActive" class="btn-primary" @click="startEdit">
              <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
              Modifier
            </button>
            <button v-if="!modele.isActive" class="btn-secondary" @click="handleReactivate">
              <FontAwesomeIcon :icon="['fas', 'rotate-right']" />
              Réactiver
            </button>
            <div v-if="isEditing" class="edit-actions">
              <button class="btn-secondary" @click="cancelEdit">Annuler</button>
              <button class="btn-primary" @click="saveEdit">
                <FontAwesomeIcon :icon="['fas', 'check']" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="!modele.isActive" class="inactive-notice">
        Cette fiche est désactivée : elle n'est plus modifiable mais reste consultable.
      </p>

      <!-- Sections de champs -->
      <section v-for="section in sections" :key="section.title" class="fields-section">
        <h3 class="fields-section__title">
          <FontAwesomeIcon :icon="['fas', section.icon]" />
          {{ section.title }}
        </h3>
        <div class="fields-grid">
          <div v-for="field in section.fields" :key="field.key" class="field">
            <label :for="field.key">{{ field.label }}</label>

            <!-- Mode édition -->
            <template v-if="isEditing">
              <input
                v-if="field.type === 'number'"
                :id="field.key"
                type="number"
                step="any"
                v-model.number="editForm[field.key]"
                :placeholder="field.unit ? `en ${field.unit}` : ''"
              />
              <input
                v-else-if="field.type === 'text' || field.type === 'url'"
                :id="field.key"
                :type="field.type === 'url' ? 'url' : 'text'"
                v-model="editForm[field.key]"
                :placeholder="field.placeholder || ''"
              />
              <input
                v-else-if="field.type === 'list'"
                :id="field.key"
                type="text"
                v-model="editForm[field.key]"
                placeholder="valeurs séparées par des virgules"
              />
              <div v-else-if="field.type === 'range'" class="range-inputs">
                <input
                  type="number"
                  step="any"
                  v-model.number="editForm[field.key].min"
                  placeholder="min"
                />
                <span class="range-sep">→</span>
                <input
                  type="number"
                  step="any"
                  v-model.number="editForm[field.key].max"
                  placeholder="max"
                />
              </div>
              <div v-else-if="field.type === 'dimensions'" class="range-inputs">
                <input
                  type="number"
                  v-model.number="editForm[field.key].hauteur"
                  placeholder="H"
                />
                <span class="range-sep">×</span>
                <input
                  type="number"
                  v-model.number="editForm[field.key].largeur"
                  placeholder="L"
                />
                <span class="range-sep">×</span>
                <input
                  type="number"
                  v-model.number="editForm[field.key].epaisseur"
                  placeholder="E"
                />
              </div>
            </template>

            <!-- Mode lecture -->
            <span v-else :class="['field__value', { 'field__value--empty': isEmpty(field) }]">
              {{ displayValue(field) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Historique des modifications -->
      <section class="fields-section">
        <h3 class="fields-section__title">
          <FontAwesomeIcon :icon="['fas', 'clock-rotate-left']" />
          Historique des modifications
        </h3>
        <div v-if="sortedHistory.length" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Champ</th>
                <th>Ancienne valeur</th>
                <th>Nouvelle valeur</th>
                <th>Auteur</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, index) in sortedHistory" :key="index">
                <td data-label="Date">{{ formatDate(entry.date) }}</td>
                <td data-label="Champ">
                  <span class="history-field">{{ fieldLabel(entry.field) }}</span>
                </td>
                <td data-label="Ancienne valeur">{{ formatHistoryValue(entry.previous_value) }}</td>
                <td data-label="Nouvelle valeur">{{ formatHistoryValue(entry.new_value) }}</td>
                <td data-label="Auteur">{{ entry.author || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-history">Aucune modification enregistrée.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import { getModeleByNom, updateModele, reactivateModele } from '@/services/modele.js'
import { formatDate } from '@/utils/formatDate.js'
import ButtonBack from '@/components/ui/ButtonBack.vue'

const props = defineProps({
  nom: { type: String, required: true },
})

const toast = useToastStore()

const modele = ref(null)
const isEditing = ref(false)
const editForm = ref({})

/**
 * Définition des sections et champs de la fiche.
 * Reflète les groupes du schéma backend (Modele.model.js) et les annexes
 * du règlement UE 2023/1542. Les champs vides s'affichent "À déterminer".
 */
const sections = [
  {
    title: 'Identité',
    icon: 'id-card',
    fields: [
      { key: 'fabricant', label: 'Fabricant', type: 'text' },
      { key: 'categorie', label: 'Catégorie de batterie', type: 'text' },
      { key: 'lieuFabrication', label: 'Lieu de fabrication', type: 'text' },
      { key: 'chimie', label: 'Chimie', type: 'text', placeholder: 'Ex: LiFePO4' },
    ],
  },
  {
    title: 'Caractéristiques techniques',
    icon: 'bolt',
    fields: [
      { key: 'capaciteKwh', label: 'Énergie', type: 'number', unit: 'kWh' },
      { key: 'capaciteAh', label: 'Capacité nominale', type: 'number', unit: 'Ah' },
      { key: 'poidsKg', label: 'Poids', type: 'number', unit: 'kg' },
      { key: 'dimensionsMm', label: 'Dimensions (H × L × E)', type: 'dimensions', unit: 'mm' },
      { key: 'tensionMinV', label: 'Tension minimale', type: 'number', unit: 'V' },
      { key: 'tensionNominaleV', label: 'Tension nominale', type: 'number', unit: 'V' },
      { key: 'tensionMaxV', label: 'Tension maximale', type: 'number', unit: 'V' },
      { key: 'puissanceOrigineW', label: "Puissance d'origine", type: 'number', unit: 'W' },
      { key: 'limitesPuissanceW', label: 'Limites de puissance', type: 'number', unit: 'W' },
      { key: 'temperatureServiceC', label: 'Température en fonctionnement', type: 'range', unit: '°C' },
      { key: 'temperatureStockageC', label: 'Température hors utilisation', type: 'range', unit: '°C' },
    ],
  },
  {
    title: 'Performances et durabilité',
    icon: 'gauge-high',
    fields: [
      { key: 'cyclesPrevus', label: 'Cycles prévus', type: 'number' },
      { key: 'essaiReference', label: "Essai de référence", type: 'text' },
      { key: 'tauxC', label: "Taux C de l'essai", type: 'number' },
      { key: 'rendementInitialPct', label: 'Rendement initial', type: 'number', unit: '%' },
      { key: 'rendement50Pct', label: 'Rendement à 50 % de vie', type: 'number', unit: '%' },
      { key: 'resistanceInterneCelluleMohm', label: 'Résistance interne cellule', type: 'number', unit: 'mΩ' },
      { key: 'resistanceInterneBatterieMohm', label: 'Résistance interne batterie', type: 'number', unit: 'mΩ' },
      { key: 'garantieMois', label: 'Garantie commerciale', type: 'number', unit: 'mois' },
    ],
  },
  {
    title: 'Composition et sécurité',
    icon: 'flask',
    fields: [
      { key: 'substancesDangereuses', label: 'Substances dangereuses', type: 'list' },
      { key: 'agentExtincteur', label: 'Agent extincteur', type: 'text' },
      { key: 'matieresCritiques', label: 'Matières premières critiques', type: 'list' },
    ],
  },
  {
    title: 'Environnement',
    icon: 'leaf',
    fields: [
      { key: 'empreinteCarboneKgCo2Kwh', label: 'Empreinte carbone', type: 'number', unit: 'kg CO₂ eq/kWh' },
      { key: 'contenuRecyclePct', label: 'Contenu recyclé', type: 'number', unit: '%' },
      { key: 'contenuRenouvelablePct', label: 'Contenu renouvelable', type: 'number', unit: '%' },
      { key: 'approvisionnementResponsable', label: 'Approvisionnement responsable', type: 'text' },
    ],
  },
  {
    title: 'Documents',
    icon: 'file',
    fields: [
      { key: 'declarationUeUrl', label: 'Déclaration UE de conformité (URL)', type: 'url' },
      // Pas de manuel ici : il dépend de la version (URL construite par
      // convention modèle + version côté passeport)
    ],
  },
]

// Labels à plat pour l'historique (field key -> label lisible)
const FIELD_LABELS = Object.fromEntries(
  sections.flatMap((s) => s.fields.map((f) => [f.key, f.label])),
)
FIELD_LABELS['création'] = 'Création de la fiche'
FIELD_LABELS['isActive'] = 'Statut actif'

const fieldLabel = (key) => FIELD_LABELS[key] || key

const sortedHistory = computed(() => {
  if (!modele.value?.history) return []
  return [...modele.value.history].sort((a, b) => new Date(b.date) - new Date(a.date))
})

// --- AFFICHAGE ---

const isEmpty = (field) => {
  const value = modele.value?.[field.key]
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (field.type === 'range') return value.min == null && value.max == null
  if (field.type === 'dimensions')
    return value.hauteur == null && value.largeur == null && value.epaisseur == null
  return false
}

const displayValue = (field) => {
  if (isEmpty(field)) return 'À déterminer'
  const value = modele.value[field.key]
  if (field.type === 'range') {
    return `${value.min ?? '?'} → ${value.max ?? '?'} ${field.unit || ''}`.trim()
  }
  if (field.type === 'dimensions') {
    return `${value.hauteur ?? '?'} × ${value.largeur ?? '?'} × ${value.epaisseur ?? '?'} mm`
  }
  if (field.type === 'list') return value.join(', ')
  return field.unit ? `${value} ${field.unit}` : `${value}`
}

const formatHistoryValue = (value) => {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ') || '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// --- ÉDITION ---

/**
 * Prépare le formulaire d'édition à partir de la fiche courante.
 * Les listes deviennent des chaînes "a, b, c", les objets imbriqués sont clonés.
 */
const startEdit = () => {
  const form = {}
  for (const section of sections) {
    for (const field of section.fields) {
      const value = modele.value[field.key]
      if (field.type === 'list') {
        form[field.key] = Array.isArray(value) ? value.join(', ') : ''
      } else if (field.type === 'range') {
        form[field.key] = { min: value?.min ?? null, max: value?.max ?? null }
      } else if (field.type === 'dimensions') {
        form[field.key] = {
          hauteur: value?.hauteur ?? null,
          largeur: value?.largeur ?? null,
          epaisseur: value?.epaisseur ?? null,
        }
      } else {
        form[field.key] = value ?? null
      }
    }
  }
  editForm.value = form
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editForm.value = {}
}

/**
 * Normalise le formulaire avant envoi : '' → null (les inputs number vidés
 * renvoient ''), listes re-découpées en tableaux. Le backend ne trace que
 * les champs réellement modifiés.
 */
const saveEdit = async () => {
  const payload = {}
  for (const section of sections) {
    for (const field of section.fields) {
      const raw = editForm.value[field.key]
      if (field.type === 'list') {
        payload[field.key] = (raw || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      } else if (field.type === 'range' || field.type === 'dimensions') {
        const cleaned = {}
        for (const [k, v] of Object.entries(raw)) {
          cleaned[k] = v === '' || v == null ? null : v
        }
        payload[field.key] = cleaned
      } else {
        payload[field.key] = raw === '' || raw == null ? null : raw
      }
    }
  }

  try {
    modele.value = await updateModele(props.nom, payload)
    isEditing.value = false
    toast.success('Fiche mise à jour')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur mise à jour de la fiche')
  }
}

/**
 * Réactive la fiche (tracé dans l'historique côté backend).
 */
const handleReactivate = async () => {
  try {
    await reactivateModele(props.nom)
    modele.value = await getModeleByNom(props.nom)
    toast.success('Fiche réactivée')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur réactivation')
  }
}

onMounted(async () => {
  try {
    modele.value = await getModeleByNom(props.nom)
  } catch {
    toast.error('Erreur lors du chargement de la fiche')
  }
})
</script>

<style lang="scss" scoped>
.page {
  max-width: 1400px;
  margin: 0 auto;
  padding: $spacing-6;
  animation: fadeIn $transition-base ease-out;

  @media (max-width: $breakpoint-sm) {
    padding: $spacing-4;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $spacing-4;
    margin-bottom: $spacing-6;

    @media (max-width: $breakpoint-sm) {
      flex-direction: column;
    }
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

.modele-card {
  @include card;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;
}

.modele-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-4;
  flex-wrap: wrap;

  &__left {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    margin: 0;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $spacing-5;
    flex-wrap: wrap;
  }
}

.modele-nom {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: var(--revaw-primary);
}

.lock-icon {
  color: var(--text-tertiary);
  font-size: $font-size-sm;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  &__label {
    font-size: $font-size-xs;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: $font-weight-medium;
  }

  &__value {
    font-size: $font-size-sm;
    color: var(--text-primary);
    font-weight: $font-weight-semibold;

    &--date {
      font-weight: $font-weight-normal;
    }
  }
}

.edit-actions {
  display: flex;
  gap: $spacing-3;
}

.status-badge {
  display: inline-block;
  width: fit-content;
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

.inactive-notice {
  padding: $spacing-3 $spacing-4;
  background-color: var(--bg-tertiary);
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  margin: 0;
}

// Sections
.fields-section {
  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0 0 $spacing-4 0;
    padding-bottom: $spacing-2;
    border-bottom: 1px solid var(--border-light);

    svg {
      color: var(--revaw-primary);
    }
  }
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-4;
}

.field {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  label {
    font-size: $font-size-xs;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: $font-weight-medium;
    letter-spacing: 0.03em;
  }

  &__value {
    font-size: $font-size-sm;
    color: var(--text-primary);
    font-weight: $font-weight-medium;
    min-height: 22px;

    &--empty {
      color: var(--text-tertiary);
      font-style: italic;
      font-weight: $font-weight-normal;
    }
  }
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: $spacing-2;

  input {
    flex: 1;
    min-width: 0;
  }
}

.range-sep {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

// Historique
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: $spacing-2 $spacing-3;
    text-align: left;
    border-bottom: 1px solid var(--border-light);
    font-size: $font-size-sm;
  }

  th {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
  }
}

.history-field {
  font-weight: $font-weight-semibold;
  color: var(--revaw-primary);
}

.empty-history {
  color: var(--text-tertiary);
  font-size: $font-size-sm;
  font-style: italic;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
