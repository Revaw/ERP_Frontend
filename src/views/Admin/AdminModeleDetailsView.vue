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
            <button
              v-if="authStore.isAdmin && !isEditing && modele.isActive"
              class="btn-primary"
              @click="startEdit"
            >
              <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
              Modifier
            </button>
            <button
              v-if="authStore.isAdmin && !modele.isActive"
              class="btn-secondary"
              @click="handleReactivate"
            >
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
          <div
            v-for="field in section.fields"
            :key="field.key"
            :class="['field', { 'field--wide': field.wide }]"
          >
            <label :for="field.key">{{ field.label }}</label>
            <span v-if="field.hint" class="field__hint">{{ field.hint }}</span>

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
                placeholder="entrée 1 ; entrée 2 — ou « néant »"
              />
              <select
                v-else-if="field.type === 'boolean'"
                :id="field.key"
                v-model="editForm[field.key]"
              >
                <option :value="null">À déterminer</option>
                <option :value="true">Oui</option>
                <option :value="false">Non</option>
              </select>
              <select
                v-else-if="field.type === 'select'"
                :id="field.key"
                v-model="editForm[field.key]"
              >
                <option :value="null">À déterminer</option>
                <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <select
                v-else-if="field.type === 'symboles'"
                :id="field.key"
                v-model="editForm[field.key]"
              >
                <option :value="null">À déterminer</option>
                <option value="aucun">Aucun (vérifié)</option>
                <option value="Cd">Cd</option>
                <option value="Pb">Pb</option>
                <option value="Cd,Pb">Cd et Pb</option>
              </select>
              <div v-else-if="field.type === 'lieu'" class="range-inputs">
                <input type="text" v-model="editForm[field.key].ville" placeholder="ville" />
                <input type="text" v-model="editForm[field.key].region" placeholder="région" />
                <input
                  type="text"
                  v-model="editForm[field.key].pays"
                  placeholder="pays (FR)"
                  maxlength="2"
                  class="input-pays"
                />
              </div>
              <div v-else-if="field.type === 'recycle'" class="recycle-inputs">
                <label v-for="mat in RECYCLE_MATERIAUX" :key="mat.key" class="recycle-item">
                  <span>{{ mat.label }}</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    v-model.number="editForm[field.key][mat.key]"
                    placeholder="%"
                  />
                </label>
              </div>
              <div v-else-if="field.type === 'powerLimits'" class="power-limits">
                <div
                  v-for="(ligne, index) in editForm[field.key]"
                  :key="index"
                  class="power-limits__row"
                >
                  <input
                    type="number"
                    step="any"
                    v-model.number="ligne.puissanceW"
                    placeholder="puissance (W)"
                  />
                  <span class="range-sep">entre</span>
                  <input
                    type="number"
                    step="any"
                    v-model.number="ligne.temperatureC.min"
                    placeholder="min °C"
                  />
                  <span class="range-sep">et</span>
                  <input
                    type="number"
                    step="any"
                    v-model.number="ligne.temperatureC.max"
                    placeholder="max °C"
                  />
                  <button
                    type="button"
                    class="btn-icon-danger"
                    title="Retirer cette plage"
                    @click="editForm[field.key].splice(index, 1)"
                  >
                    <FontAwesomeIcon :icon="['fas', 'trash']" />
                  </button>
                </div>
                <button type="button" class="btn-secondary btn-add-row" @click="addPowerLimit(field.key)">
                  <FontAwesomeIcon :icon="['fas', 'plus']" />
                  Ajouter une plage
                </button>
              </div>
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
import { useAuthStore } from '@/stores/auth.js'
import { getModeleByNom, updateModele, reactivateModele } from '@/services/modele.js'
import { formatDate } from '@/utils/formatDate.js'
import ButtonBack from '@/components/ui/ButtonBack.vue'

const props = defineProps({
  nom: { type: String, required: true },
})

const toast = useToastStore()
const authStore = useAuthStore()

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
      // (pas de fabricant : donnée d'entreprise, portée par le back du passeport)
      { key: 'categorie', label: 'Catégorie de batterie', type: 'text', hint: 'Catégorie réglementaire UE (les nôtres : batterie industrielle rechargeable)' },
      { key: 'lieuFabrication', label: 'Lieu de fabrication', type: 'lieu', hint: "Usine d'assemblage — ville, région et pays en code à 2 lettres (FR)" },
      { key: 'chimie', label: 'Chimie', type: 'text', placeholder: 'Ex: LiFePO4', hint: "Technologie de stockage de l'énergie" },
      {
        key: 'statut',
        label: 'Statut UE (état de la batterie)',
        type: 'select',
        hint: 'Commun à toutes les batteries du modèle (seconde vie Revaw) — remanufacturée = remise à neuf pour le même usage, reconvertie = autre usage que l\'origine',
        options: [
          { value: 'remanufacturee', label: 'Remanufacturée (même usage)' },
          { value: 'reconvertie', label: 'Reconvertie (autre usage)' },
          { value: 'reutilisee', label: 'Réutilisée (telle quelle)' },
          { value: 'originale', label: 'Originale (neuve)' },
        ],
      },
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
      { key: 'temperatureTensionsC', label: 'Validité des tensions (température)', type: 'range', unit: '°C', hint: 'Plage de température où les 3 tensions annoncées restent vraies' },
      { key: 'puissanceOrigineW', label: "Puissance d'origine", type: 'number', unit: 'W', hint: 'Puissance que la batterie neuve peut fournir' },
      { key: 'limitesPuissance', label: 'Limites de puissance par température', type: 'powerLimits', wide: true, hint: "Puissance max par plage de température (une ligne par plage ; reprendre la puissance d'origine si elle ne baisse pas au froid/chaud)" },
      { key: 'temperatureServiceC', label: 'Température en fonctionnement', type: 'range', unit: '°C' },
      { key: 'temperatureStockageC', label: 'Température hors utilisation', type: 'range', unit: '°C', hint: 'Plage de stockage batterie éteinte' },
      { key: 'essaiStockage', label: 'Essai température de stockage', type: 'text', placeholder: 'Ex: IEC 62619', hint: 'Norme ou test qui prouve la plage de stockage' },
    ],
  },
  {
    title: 'Performances et durabilité',
    icon: 'gauge-high',
    fields: [
      { key: 'cyclesPrevus', label: 'Cycles prévus', type: 'number', hint: '1 cycle = une charge + une décharge complètes' },
      { key: 'essaiReference', label: "Essai de référence", type: 'text', hint: 'Norme et conditions du test qui prouve le nombre de cycles (ex: IEC 62620, 25 °C)' },
      { key: 'dureeVieAns', label: 'Durée de vie attendue', type: 'number', unit: 'ans', hint: 'En années, pour un usage normal' },
      { key: 'tauxCCharge', label: "Taux C de charge de l'essai", type: 'number', unit: 'C', hint: 'Vitesse de charge pendant le test de cycles (1C = pleine charge en 1 h, 0,5C en 2 h)' },
      { key: 'tauxCDecharge', label: "Taux C de décharge de l'essai", type: 'number', unit: 'C', hint: 'Même chose pour la vitesse de décharge' },
      { key: 'rendementInitialPct', label: 'Rendement initial', type: 'number', unit: '%', hint: 'Énergie restituée / énergie injectée (aller-retour), batterie neuve' },
      { key: 'rendement50Pct', label: 'Rendement à 50 % de vie', type: 'number', unit: '%', hint: 'Même rendement, mesuré à la moitié des cycles prévus' },
      { key: 'resistanceInterneCelluleMohm', label: 'Résistance interne cellule', type: 'number', unit: 'mΩ', hint: 'Fiche technique du fournisseur des cellules' },
      { key: 'resistanceInterneBatterieMohm', label: 'Résistance interne batterie', type: 'number', unit: 'mΩ', hint: 'Batterie complète, cellules assemblées (mesurée en fin de production)' },
    ],
  },
  {
    title: 'Composition et sécurité',
    icon: 'flask',
    fields: [
      { key: 'substancesDangereuses', label: 'Substances dangereuses', type: 'list', hint: 'Produits dangereux de la fiche de sécurité (FDS) des cellules, hors mercure/cadmium/plomb' },
      { key: 'agentExtincteur', label: 'Agent extincteur', type: 'text', hint: 'Ce que les pompiers doivent utiliser en cas d\'incendie (FDS, rubrique incendie)' },
      { key: 'matieresCritiques', label: 'Matières premières critiques', type: 'list', hint: 'Matières de la liste UE dépassant 0,1 % du poids (lithium, cuivre, graphite…)' },
      { key: 'symbolePoubelleBarree', label: 'Poubelle barrée sur l\'étiquette', type: 'boolean', hint: 'Le logo « ne pas jeter aux ordures » figure-t-il sur l\'étiquette ?' },
      { key: 'symbolesChimiques', label: 'Symboles chimiques (Cd / Pb)', type: 'symboles', hint: 'Marquage sous la poubelle barrée si cadmium ou plomb au-delà du seuil (lithium : aucun en général)' },
      { key: 'compositionCathode', label: 'Cathode (électrode +)', type: 'text', placeholder: 'Ex: LiFePO4', hint: 'Matériau du côté positif des cellules' },
      { key: 'compositionAnode', label: 'Anode (électrode −)', type: 'text', placeholder: 'Ex: graphite', hint: 'Matériau du côté négatif' },
      { key: 'compositionElectrolyte', label: 'Électrolyte', type: 'text', hint: 'Le liquide conducteur à l\'intérieur des cellules' },
    ],
  },
  {
    title: 'Environnement (en attente de la réglementation UE — ne pas remplir)',
    icon: 'leaf',
    fields: [
      { key: 'empreinteCarboneKgCo2Kwh', label: 'Empreinte carbone', type: 'number', unit: 'kg CO₂ eq/kWh', hint: 'CO₂ émis pour fabriquer la batterie (étude ACV déclarée)' },
      { key: 'etiquetteCarbone', label: 'Classe de performance carbone', type: 'text', hint: 'Classe A-E de l\'étiquette carbone (règles UE pas encore publiées)' },
      { key: 'contenuRecycle', label: 'Contenu recyclé par matériau', type: 'recycle', wide: true, hint: 'Part de matière recyclée dans chaque matériau (règles UE pas encore publiées)' },
      { key: 'contenuRenouvelablePct', label: 'Contenu renouvelable', type: 'number', unit: '%', hint: 'Part du poids d\'origine végétale ou biologique (souvent 0 % pour une batterie)' },
      { key: 'approvisionnementResponsable', label: 'Approvisionnement responsable', type: 'text', hint: 'Lien vers le rapport de diligence sur l\'origine des matières (exigé août 2027)' },
    ],
  },
  {
    title: 'Documents',
    icon: 'file',
    fields: [
      { key: 'declarationUeUrl', label: 'Déclaration UE de conformité (URL)', type: 'url', hint: 'Le document officiel du marquage CE' },
      { key: 'piecesDetacheesUrl', label: 'Catalogue pièces détachées (URL)', type: 'url', hint: 'Références des pièces remplaçables et où les commander (visible des professionnels)' },
      { key: 'planDemontage', label: 'Notice de démontage (URL)', type: 'url', hint: 'Éclaté, étapes, fixations, outils, mises en garde (visible des professionnels)' },
      { key: 'consignesSecurite', label: "Consignes d'intervention (URL)", type: 'url', hint: 'Précautions avant de toucher la batterie : couper le courant, gants isolants… (professionnels)' },
      { key: 'rapportsEssais', label: 'Rapports de conformité (URL)', type: 'url', hint: 'Rapports des tests sécurité/performance (visibles des autorités seulement)' },
      // Pas de manuel ici : il dépend de la version (URL construite par
      // convention modèle + version côté passeport)
    ],
  },
  {
    title: 'Affichage passeport (hors schéma UE)',
    icon: 'eye',
    fields: [
      { key: 'marquages', label: 'Signification des marquages', type: 'list', hint: 'Une entrée par logo de l\'étiquette, au format « logo = signification », séparées par des points-virgules' },
      { key: 'referencesComposants', label: 'Références des composants', type: 'list', hint: 'Une entrée par composant remplaçable (« référence — nom »), séparées par des points-virgules' },
      { key: 'fournisseursPieces', label: 'Fournisseurs des pièces', type: 'list', hint: 'Un fournisseur par entrée, séparés par des points-virgules' },
      { key: 'outilsDemontage', label: 'Outils de démontage', type: 'text', hint: 'Outils nécessaires pour ouvrir la batterie (ex: clé Torx T25, pince isolée)' },
      { key: 'fixations', label: 'Fixations (type et nombre)', type: 'text', hint: 'Vis, clips… à défaire pour le démontage (ex: 8 vis M5, 4 clips)' },
      { key: 'dispositionCellules', label: 'Cellules (nombre et disposition)', type: 'text', hint: 'Ex: 15 cellules en série, 3 rangées de 5' },
    ],
  },
]

// Matériaux du contenu recyclé (schéma UE : un pourcentage par matériau)
const RECYCLE_MATERIAUX = [
  { key: 'cobaltPct', label: 'Cobalt' },
  { key: 'lithiumPct', label: 'Lithium' },
  { key: 'nickelPct', label: 'Nickel' },
  { key: 'plombPct', label: 'Plomb' },
]

// Labels à plat pour l'historique (field key -> label lisible)
const FIELD_LABELS = Object.fromEntries(
  sections.flatMap((s) => s.fields.map((f) => [f.key, f.label])),
)
FIELD_LABELS['création'] = 'Création de la fiche'
FIELD_LABELS['isActive'] = 'Statut actif'
// Anciens champs (schéma d'avant la migration passeport du 25/11) : leurs
// entrées d'historique doivent rester lisibles
FIELD_LABELS['fabricant'] = 'Fabricant (retiré)'
FIELD_LABELS['limitesPuissanceW'] = 'Limites de puissance (ancien format)'
FIELD_LABELS['contenuRecyclePct'] = 'Contenu recyclé (ancien format)'
FIELD_LABELS['tauxC'] = 'Taux C (retiré — remplacé par charge/décharge)'
FIELD_LABELS['garantieMois'] = 'Garantie commerciale (retirée — gérée par client)'

const fieldLabel = (key) => FIELD_LABELS[key] || key

const sortedHistory = computed(() => {
  if (!modele.value?.history) return []
  return [...modele.value.history].sort((a, b) => new Date(b.date) - new Date(a.date))
})

// --- AFFICHAGE ---

const isEmpty = (field) => {
  const value = modele.value?.[field.key]
  if (value == null || value === '') return true
  // Convention passeport : [] = « vérifié, aucun » → PAS vide (affiché Néant)
  if (Array.isArray(value)) return false
  if (field.type === 'range') return value.min == null && value.max == null
  if (field.type === 'dimensions')
    return value.hauteur == null && value.largeur == null && value.epaisseur == null
  if (field.type === 'lieu')
    return value.ville == null && value.region == null && value.pays == null
  if (field.type === 'recycle')
    return RECYCLE_MATERIAUX.every((m) => value[m.key] == null)
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
  if (field.type === 'lieu') {
    return [value.ville, value.region, value.pays].filter(Boolean).join(', ')
  }
  if (field.type === 'boolean') return value ? 'Oui' : 'Non'
  if (field.type === 'select') {
    return field.options.find((o) => o.value === value)?.label ?? String(value)
  }
  if (field.type === 'recycle') {
    return RECYCLE_MATERIAUX.map((m) => `${m.label} ${value[m.key] ?? '—'}${value[m.key] != null ? ' %' : ''}`).join(' · ')
  }
  if (field.type === 'powerLimits') {
    if (value.length === 0) return 'À déterminer'
    return value
      .map((l) => `${l.puissanceW} W (${l.temperatureC?.min ?? '?'} → ${l.temperatureC?.max ?? '?'} °C)`)
      .join(' ; ')
  }
  if (field.type === 'list' || field.type === 'symboles') {
    if (value.length === 0) return 'Néant'
    return value.join(value.some((v) => String(v).includes(',')) ? ' ; ' : ', ')
  }
  return field.unit ? `${value} ${field.unit}` : `${value}`
}

const formatHistoryValue = (value) => {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Néant'
    return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// --- ÉDITION ---

/**
 * Prépare le formulaire d'édition à partir de la fiche courante.
 * Les listes deviennent des chaînes "a, b, c", les objets imbriqués sont clonés.
 */
const addPowerLimit = (key) => {
  editForm.value[key].push({ puissanceW: null, temperatureC: { min: null, max: null } })
}

const startEdit = () => {
  const form = {}
  for (const section of sections) {
    for (const field of section.fields) {
      const value = modele.value[field.key]
      if (field.type === 'list') {
        // null → champ vide (à déterminer), [] → « néant » (vérifié aucun).
        // Jointure par « ; » si une entrée contient une virgule (phrases)
        if (value == null) form[field.key] = ''
        else if (value.length === 0) form[field.key] = 'néant'
        else form[field.key] = value.join(value.some((v) => v.includes(',')) ? ' ; ' : ', ')
      } else if (field.type === 'symboles') {
        // null / [] / ["Cd"] / ["Pb"] / ["Cd","Pb"] → valeur du select
        if (value == null) form[field.key] = null
        else form[field.key] = value.length === 0 ? 'aucun' : value.join(',')
      } else if (field.type === 'range') {
        form[field.key] = { min: value?.min ?? null, max: value?.max ?? null }
      } else if (field.type === 'dimensions') {
        form[field.key] = {
          hauteur: value?.hauteur ?? null,
          largeur: value?.largeur ?? null,
          epaisseur: value?.epaisseur ?? null,
        }
      } else if (field.type === 'lieu') {
        form[field.key] = {
          ville: value?.ville ?? null,
          region: value?.region ?? null,
          pays: value?.pays ?? null,
        }
      } else if (field.type === 'recycle') {
        form[field.key] = Object.fromEntries(
          RECYCLE_MATERIAUX.map((m) => [m.key, value?.[m.key] ?? null]),
        )
      } else if (field.type === 'powerLimits') {
        form[field.key] = (value ?? []).map((l) => ({
          puissanceW: l.puissanceW ?? null,
          temperatureC: { min: l.temperatureC?.min ?? null, max: l.temperatureC?.max ?? null },
        }))
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
        // vide → null (à déterminer), « néant »/« aucun » → [] (vérifié aucun)
        const texte = (raw || '').trim()
        if (!texte) payload[field.key] = null
        else if (['néant', 'neant', 'aucun', 'aucune'].includes(texte.toLowerCase()))
          payload[field.key] = []
        else
          // « ; » prioritaire : permet des entrées contenant des virgules
          payload[field.key] = texte
            .split(texte.includes(';') ? ';' : ',')
            .map((s) => s.trim())
            .filter(Boolean)
      } else if (field.type === 'symboles') {
        if (raw == null || raw === '') payload[field.key] = null
        else payload[field.key] = raw === 'aucun' ? [] : raw.split(',')
      } else if (field.type === 'boolean') {
        payload[field.key] = raw === '' || raw == null ? null : raw
      } else if (field.type === 'range' || field.type === 'dimensions' || field.type === 'lieu' || field.type === 'recycle') {
        const cleaned = {}
        for (const [k, v] of Object.entries(raw)) {
          cleaned[k] = v === '' || v == null ? null : v
        }
        payload[field.key] = cleaned
      } else if (field.type === 'powerLimits') {
        // lignes sans puissance ignorées ; aucune ligne → null (le backend
        // refuse [], qui n'a pas de sens pour ce champ)
        const lignes = raw
          .filter((l) => l.puissanceW != null && l.puissanceW !== '')
          .map((l) => ({
            puissanceW: l.puissanceW,
            temperatureC: {
              min: l.temperatureC.min === '' || l.temperatureC.min == null ? null : l.temperatureC.min,
              max: l.temperatureC.max === '' || l.temperatureC.max == null ? null : l.temperatureC.max,
            },
          }))
        payload[field.key] = lignes.length > 0 ? lignes : null
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

  &__hint {
    font-size: $font-size-xs;
    color: var(--text-tertiary);
    line-height: 1.35;
    margin-top: -2px;
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

.field--wide {
  grid-column: 1 / -1;
}

.input-pays {
  max-width: 90px;
  text-transform: uppercase;
}

.recycle-inputs {
  display: flex;
  gap: $spacing-3;
  flex-wrap: wrap;
}

.recycle-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;
  flex: 1;
  min-width: 90px;

  span {
    font-size: $font-size-xs;
    color: var(--text-secondary);
  }
}

.power-limits {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  &__row {
    display: flex;
    align-items: center;
    gap: $spacing-2;

    input {
      flex: 1;
      min-width: 0;
    }
  }
}

.btn-add-row {
  width: fit-content;
  font-size: $font-size-sm;
}

.btn-icon-danger {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-danger, #c0392b);
  padding: $spacing-1 $spacing-2;
  flex-shrink: 0;

  &:hover {
    opacity: 0.7;
  }
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
