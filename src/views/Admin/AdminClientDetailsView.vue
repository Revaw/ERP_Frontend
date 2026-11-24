<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h1 class="page__title">Fiche client</h1>
        <p class="page__subtitle">Identité, conditions commerciales et comptes d'accès</p>
      </div>
      <ButtonBack />
    </div>

    <div v-if="client" class="content">
      <!-- Identité -->
      <div class="card">
        <div class="identity">
          <div class="identity__left">
            <span class="slug-badge">{{ client.slug }}</span>
            <input
              v-if="isEditingNom"
              type="text"
              v-model="nomDraft"
              class="identity__nom-input"
              @keyup.enter="saveNom"
            />
            <h2 v-else class="identity__nom">{{ client.nom }}</h2>
            <button
              v-if="!isEditingNom && authStore.isSuperAdmin"
              class="btn-icon"
              title="Renommer (le slug, lui, est définitif)"
              @click="startEditNom"
            >
              <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
            </button>
            <template v-else>
              <button class="btn-icon" title="Valider" @click="saveNom">
                <FontAwesomeIcon :icon="['fas', 'check']" />
              </button>
              <button class="btn-icon" title="Annuler" @click="isEditingNom = false">
                <FontAwesomeIcon :icon="['fas', 'xmark']" />
              </button>
            </template>
          </div>
          <div class="identity__right">
            <span
              :class="[
                'status-badge',
                client.isActive ? 'status-badge--active' : 'status-badge--inactive',
              ]"
            >
              {{ client.isActive ? 'Actif' : 'Inactif' }}
            </span>
            <button
              v-if="client.isActive && authStore.isSuperAdmin"
              class="btn-icon btn-icon--danger"
              title="Désactiver le client"
              @click="isConfirmModalOpen = true"
            >
              <FontAwesomeIcon :icon="['fas', 'ban']" />
            </button>
            <button
              v-else-if="!client.isActive && authStore.isSuperAdmin"
              class="btn-secondary btn--sm"
              @click="toggleActive(true)"
            >
              <FontAwesomeIcon :icon="['fas', 'rotate-right']" />
              Réactiver
            </button>
          </div>
        </div>
      </div>

      <!-- Conditions commerciales -->
      <div class="card">
        <div class="card__header">
          <div>
            <h3 class="card__title">
              <FontAwesomeIcon :icon="['fas', 'tag']" />
              Modèles & garanties
            </h3>
            <p class="card__subtitle">
              Conditions négociées : la garantie affichée sur les batteries de ce client en
              découle. Ne pas modifier la garantie d'un modèle dont des batteries sont déjà
              expédiées (effet rétroactif).
            </p>
          </div>
          <button
            v-if="!isEditingModeles && authStore.isSuperAdmin"
            class="btn-primary btn--sm"
            @click="startEditModeles"
          >
            <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
            Modifier
          </button>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Modèle</th>
              <th>Garantie</th>
              <th v-if="isEditingModeles"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in isEditingModeles ? modelesDraft : client.modeles" :key="index">
              <td data-label="Modèle">
                <select v-if="isEditingModeles" v-model="item.modele" required>
                  <option value="" disabled>-- Choisir un modèle --</option>
                  <option
                    v-for="m in modelesReferentiel"
                    :key="m.nom"
                    :value="m.nom"
                    :disabled="m.isActive === false && item.modele !== m.nom"
                  >
                    {{ m.nom }} ({{ m.capaciteKwh }} kWh){{ m.isActive === false ? ' — inactif' : '' }}
                  </option>
                </select>
                <span v-else class="modele-name">{{ item.modele }}</span>
              </td>
              <td data-label="Garantie">
                <input
                  v-if="isEditingModeles"
                  type="number"
                  min="0"
                  v-model.number="item.garantieAns"
                  class="qty-input"
                />
                <span v-else>{{ item.garantieAns }} ans</span>
              </td>
              <td v-if="isEditingModeles">
                <button class="btn-icon btn-icon--danger" @click="removeModele(index)">
                  <FontAwesomeIcon :icon="['fas', 'xmark']" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!isEditingModeles && client.modeles.length === 0" class="empty-state">
          Aucune condition renseignée — cliquer sur "Modifier" pour ajouter un modèle.
        </p>

        <div v-if="isEditingModeles" class="edit-actions">
          <button class="btn-add" @click="addModele">
            <FontAwesomeIcon :icon="['fas', 'plus']" />
            Ajouter un modèle
          </button>
          <div class="edit-actions__buttons">
            <button class="btn-secondary" @click="isEditingModeles = false">Annuler</button>
            <button class="btn-primary" @click="saveModeles">
              <FontAwesomeIcon :icon="['fas', 'check']" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <!-- Contacts -->
      <div class="card">
        <div class="card__header">
          <div>
            <h3 class="card__title">
              <FontAwesomeIcon :icon="['fas', 'user']" />
              Contacts
            </h3>
            <p class="card__subtitle">Interlocuteurs chez ce client (commercial, SAV, compta...)</p>
          </div>
          <button
            v-if="!isEditingContacts && authStore.isSuperAdmin"
            class="btn-primary btn--sm"
            @click="startEditContacts"
          >
            <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
            Modifier
          </button>
        </div>

        <table v-if="isEditingContacts || client.contacts?.length" class="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th v-if="isEditingContacts"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, index) in isEditingContacts ? contactsDraft : client.contacts" :key="index">
              <td data-label="Nom">
                <input v-if="isEditingContacts" type="text" v-model="c.nom" placeholder="Nom *" />
                <span v-else>{{ c.nom }}</span>
              </td>
              <td data-label="Rôle">
                <input v-if="isEditingContacts" type="text" v-model="c.role" placeholder="ex: SAV" />
                <span v-else>{{ c.role || '—' }}</span>
              </td>
              <td data-label="Email">
                <input v-if="isEditingContacts" type="email" v-model="c.email" placeholder="email" />
                <a v-else-if="c.email" :href="`mailto:${c.email}`" class="info-link">{{ c.email }}</a>
                <span v-else>—</span>
              </td>
              <td data-label="Téléphone">
                <input v-if="isEditingContacts" type="tel" v-model="c.tel" placeholder="numéro" />
                <a v-else-if="c.tel" :href="`tel:${c.tel}`" class="info-link">{{ c.tel }}</a>
                <span v-else>—</span>
              </td>
              <td v-if="isEditingContacts">
                <button class="btn-icon btn-icon--danger" @click="removeContact(index)">
                  <FontAwesomeIcon :icon="['fas', 'xmark']" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!isEditingContacts && !client.contacts?.length" class="empty-state">
          Aucun contact renseigné.
        </p>

        <div v-if="isEditingContacts" class="edit-actions">
          <button class="btn-add" @click="addContact">
            <FontAwesomeIcon :icon="['fas', 'plus']" />
            Ajouter contact
          </button>
          <div class="edit-actions__buttons">
            <button class="btn-secondary" @click="isEditingContacts = false">Annuler</button>
            <button class="btn-primary" @click="saveContacts">
              <FontAwesomeIcon :icon="['fas', 'check']" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <!-- Adresses de livraison -->
      <div class="card">
        <div class="card__header">
          <div>
            <h3 class="card__title">
              <FontAwesomeIcon :icon="['fas', 'warehouse']" />
              Adresses de livraison
            </h3>
            <p class="card__subtitle">Plusieurs possibles — un nom court pour les distinguer</p>
          </div>
          <button
            v-if="!isEditingAdresses && authStore.isSuperAdmin"
            class="btn-primary btn--sm"
            @click="startEditAdresses"
          >
            <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
            Modifier
          </button>
        </div>

        <template v-if="isEditingAdresses">
          <div v-for="(a, index) in adressesDraft" :key="index" class="adresse-row">
            <div class="adresse-row__fields">
              <input type="text" v-model="a.nom" placeholder="Nom (ex: Entrepôt Lyon) *" />
              <textarea v-model="a.adresse" rows="3" placeholder="Adresse complète *"></textarea>
            </div>
            <button class="btn-icon btn-icon--danger" @click="removeAdresse(index)">
              <FontAwesomeIcon :icon="['fas', 'xmark']" />
            </button>
          </div>
          <div class="edit-actions">
            <button class="btn-add" @click="addAdresse">
              <FontAwesomeIcon :icon="['fas', 'plus']" />
              Ajouter une adresse
            </button>
            <div class="edit-actions__buttons">
              <button class="btn-secondary" @click="isEditingAdresses = false">Annuler</button>
              <button class="btn-primary" @click="saveAdresses">
                <FontAwesomeIcon :icon="['fas', 'check']" />
                Enregistrer
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-for="(a, index) in client.adressesLivraison" :key="index" class="adresse-view">
            <span class="adresse-view__nom">{{ a.nom }}</span>
            <p class="adresse-view__texte">{{ a.adresse }}</p>
          </div>
          <p v-if="!client.adressesLivraison?.length" class="empty-state">
            Aucune adresse de livraison renseignée.
          </p>
        </template>
      </div>

      <!-- Notes -->
      <div class="card">
        <div class="card__header">
          <div>
            <h3 class="card__title">
              <FontAwesomeIcon :icon="['fas', 'clipboard-list']" />
              Notes
            </h3>
          </div>
          <button
            v-if="!isEditingNotes && authStore.isSuperAdmin"
            class="btn-primary btn--sm"
            @click="startEditNotes"
          >
            <FontAwesomeIcon :icon="['fas', 'pen-to-square']" />
            Modifier
          </button>
        </div>

        <template v-if="isEditingNotes">
          <textarea v-model="notesDraft" rows="5" class="notes-textarea" placeholder="Notes libres sur ce client..."></textarea>
          <div class="edit-actions">
            <span></span>
            <div class="edit-actions__buttons">
              <button class="btn-secondary" @click="isEditingNotes = false">Annuler</button>
              <button class="btn-primary" @click="saveNotes">
                <FontAwesomeIcon :icon="['fas', 'check']" />
                Enregistrer
              </button>
            </div>
          </div>
        </template>
        <p v-else-if="client.notes" class="notes-view">{{ client.notes }}</p>
        <p v-else class="empty-state">Aucune note.</p>
      </div>

      <!-- Comptes d'accès (gestion des utilisateurs = superadmin, backend verrouillé) -->
      <div v-if="authStore.isSuperAdmin" class="card">
        <div class="card__header">
          <div>
            <h3 class="card__title">
              <FontAwesomeIcon :icon="['fas', 'users-gear']" />
              Comptes d'accès aux données
            </h3>
            <p class="card__subtitle">
              Logins rattachés à ce client (tenantId "{{ client.slug }}") — accès à l'interface
              MultiBat, limité à ses devices. Un client peut exister sans aucun compte.
            </p>
          </div>
          <!-- Masqué si client inactif : le backend refuse un compte sur un tenant inactif -->
          <button v-if="client.isActive" class="btn-primary btn--sm" @click="goCreateAccount">
            <FontAwesomeIcon :icon="['fas', 'user-plus']" />
            Créer un compte d'accès
          </button>
        </div>

        <table v-if="accounts.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Créé le</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in accounts" :key="a._id">
              <td data-label="Identifiant">{{ a.username }}</td>
              <td data-label="Rôle">{{ a.role }}</td>
              <td data-label="Statut">
                <span
                  :class="['status-badge', a.isActive !== false ? 'status-badge--active' : 'status-badge--inactive']"
                >
                  {{ a.isActive !== false ? 'Actif' : 'Désactivé' }}
                </span>
              </td>
              <td data-label="Créé le">{{ formatDate(a.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-state">Aucun compte d'accès pour ce client.</p>
      </div>
    </div>

    <div v-else class="loading-state">
      <Loader />
      <p>Chargement de la fiche client...</p>
    </div>

    <!-- Confirmation désactivation -->
    <Modal
      :isOpen="isConfirmModalOpen"
      title="Désactiver le client"
      @close="isConfirmModalOpen = false"
    >
      <p>
        Voulez-vous désactiver <strong>{{ client?.nom }}</strong> ({{ client?.slug }}) ?
      </p>
      <p class="text-muted mt-2">
        Il n'apparaîtra plus dans les choix de tenant à la création de compte. Ses batteries,
        devices et comptes existants ne sont pas modifiés, et la fiche reste consultable.
      </p>
      <template #footer>
        <button class="btn-secondary" @click="isConfirmModalOpen = false">Annuler</button>
        <button class="btn-danger" @click="toggleActive(false)">
          <FontAwesomeIcon :icon="['fas', 'ban']" />
          Désactiver
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
//store
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
// Services API
import { getClientBySlug, updateClient, getClientAccounts } from '@/services/clients.js'
import { getAllModeles } from '@/services/modele.js'
// Utils
import { formatDate } from '@/utils/formatDate.js'
// Composants UI
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'
import Modal from '@/components/ui/Modal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const authStore = useAuthStore()

// --- ÉTAT ---
const client = ref(null)
const accounts = ref([])
const modelesReferentiel = ref([]) // fiches de la collection modele (pour le select)
const isConfirmModalOpen = ref(false)

// Édition du nom (le slug est immuable)
const isEditingNom = ref(false)
const nomDraft = ref('')

// Édition des conditions commerciales
const isEditingModeles = ref(false)
const modelesDraft = ref([])

// --- CHARGEMENT ---
// La fiche d'abord (bloquante), puis comptes et référentiel modèles en
// dégradé : un échec secondaire ne doit pas laisser la page sur le loader.
const load = async () => {
  const slug = route.params.slug
  try {
    client.value = await getClientBySlug(slug)
  } catch {
    toast.error('Erreur chargement de la fiche client')
    return
  }
  // Comptes rattachés : section superadmin uniquement (route verrouillée backend)
  if (authStore.isSuperAdmin) {
    try {
      accounts.value = await getClientAccounts(slug)
    } catch {
      toast.error('Comptes rattachés indisponibles')
    }
  }
  try {
    // includeInactive : une condition peut pointer vers un modèle désactivé
    // depuis — il doit rester visible dans le select en édition.
    modelesReferentiel.value = await getAllModeles(true)
  } catch {
    toast.error('Référentiel modèles indisponible')
  }
}

// --- NOM ---
const startEditNom = () => {
  nomDraft.value = client.value.nom
  isEditingNom.value = true
}
const saveNom = async () => {
  try {
    client.value = await updateClient(client.value.slug, { nom: nomDraft.value })
    isEditingNom.value = false
    toast.success('Nom mis à jour')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur mise à jour du nom')
  }
}

// --- STATUT ---
const toggleActive = async (isActive) => {
  try {
    client.value = await updateClient(client.value.slug, { isActive })
    toast.success(isActive ? 'Client réactivé' : 'Client désactivé')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur changement de statut')
  } finally {
    isConfirmModalOpen.value = false
  }
}

// --- CONDITIONS COMMERCIALES ---
const startEditModeles = () => {
  // Clone pour ne pas toucher l'affichage tant que ce n'est pas enregistré
  modelesDraft.value = client.value.modeles.map((m) => ({ ...m }))
  isEditingModeles.value = true
}
const addModele = () => {
  modelesDraft.value.push({ modele: '', garantieAns: 10 })
}
const removeModele = (index) => {
  modelesDraft.value.splice(index, 1)
}
const saveModeles = async () => {
  if (modelesDraft.value.some((m) => !m.modele)) {
    return toast.error('Chaque ligne doit avoir un modèle (ou supprimer les lignes vides).')
  }
  if (modelesDraft.value.some((m) => m.garantieAns === '' || m.garantieAns < 0)) {
    return toast.error('Garantie invalide.')
  }
  const noms = modelesDraft.value.map((m) => m.modele)
  if (new Set(noms).size !== noms.length) {
    return toast.error('Un même modèle ne peut apparaître qu\'une fois.')
  }
  try {
    client.value = await updateClient(client.value.slug, { modeles: modelesDraft.value })
    isEditingModeles.value = false
    toast.success('Conditions commerciales enregistrées')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur enregistrement')
  }
}

// --- CONTACTS ---
const isEditingContacts = ref(false)
const contactsDraft = ref([])

const startEditContacts = () => {
  contactsDraft.value = (client.value.contacts || []).map((c) => ({ ...c }))
  isEditingContacts.value = true
}
const addContact = () => {
  contactsDraft.value.push({ nom: '', role: '', email: '', tel: '' })
}
const removeContact = (index) => {
  contactsDraft.value.splice(index, 1)
}
const saveContacts = async () => {
  if (contactsDraft.value.some((c) => !c.nom?.trim())) {
    return toast.error('Chaque contact doit avoir un nom (ou supprimer les lignes vides).')
  }
  try {
    client.value = await updateClient(client.value.slug, { contacts: contactsDraft.value })
    isEditingContacts.value = false
    toast.success('Contacts enregistrés')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur enregistrement contacts')
  }
}

// --- ADRESSES DE LIVRAISON ---
const isEditingAdresses = ref(false)
const adressesDraft = ref([])

const startEditAdresses = () => {
  adressesDraft.value = (client.value.adressesLivraison || []).map((a) => ({ ...a }))
  isEditingAdresses.value = true
}
const addAdresse = () => {
  adressesDraft.value.push({ nom: '', adresse: '' })
}
const removeAdresse = (index) => {
  adressesDraft.value.splice(index, 1)
}
const saveAdresses = async () => {
  if (adressesDraft.value.some((a) => !a.nom?.trim() || !a.adresse?.trim())) {
    return toast.error('Chaque adresse doit avoir un nom et une adresse (ou supprimer les lignes vides).')
  }
  try {
    client.value = await updateClient(client.value.slug, {
      adressesLivraison: adressesDraft.value,
    })
    isEditingAdresses.value = false
    toast.success('Adresses enregistrées')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur enregistrement adresses')
  }
}

// --- NOTES ---
const isEditingNotes = ref(false)
const notesDraft = ref('')

const startEditNotes = () => {
  notesDraft.value = client.value.notes || ''
  isEditingNotes.value = true
}
const saveNotes = async () => {
  try {
    client.value = await updateClient(client.value.slug, { notes: notesDraft.value })
    isEditingNotes.value = false
    toast.success('Notes enregistrées')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur enregistrement notes')
  }
}

// --- COMPTE D'ACCÈS ---
// Redirige vers la gestion utilisateurs avec le tenant pré-rempli
const goCreateAccount = () => {
  router.push({ path: '/admin/users', query: { create: '1', tenant: client.value.slug } })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.page {
  max-width: 1000px;
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

.content {
  display: flex;
  flex-direction: column;
  gap: $spacing-5;
}

.card {
  @include card;
  padding: $spacing-5;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $spacing-4;
    margin-bottom: $spacing-4;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0;

    svg {
      color: var(--revaw-primary);
    }
  }

  &__subtitle {
    font-size: $font-size-xs;
    color: var(--text-secondary);
    margin: $spacing-1 0 0 0;
    line-height: 1.4;
    max-width: 560px;
  }
}

.identity {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-4;
  flex-wrap: wrap;

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__nom {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
    color: var(--text-primary);
    margin: 0;
  }

  &__nom-input {
    font-size: $font-size-lg;
  }
}

.slug-badge {
  font-family: monospace;
  font-weight: $font-weight-semibold;
  padding: $spacing-1 $spacing-2;
  background-color: var(--color-info-bg);
  color: var(--color-info);
  border-radius: $radius-sm;
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
}

.modele-name {
  font-family: monospace;
  font-weight: $font-weight-semibold;
}

.qty-input {
  width: 80px;
  text-align: center;
}

.empty-state {
  padding: $spacing-4;
  text-align: center;
  color: var(--text-secondary);
  font-size: $font-size-sm;
}

.edit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-3;
  margin-top: $spacing-4;
  flex-wrap: wrap;

  &__buttons {
    display: flex;
    gap: $spacing-3;
  }
}

.btn-add {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  background-color: transparent;
  border: 1px dashed var(--border-default);
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  cursor: pointer;

  &:hover {
    border-color: var(--revaw-primary);
    color: var(--revaw-primary);
  }
}

.btn--sm {
  padding: $spacing-2 $spacing-3;
  font-size: $font-size-sm;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.info-link {
  color: var(--revaw-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

// Adresses de livraison
.adresse-row {
  display: flex;
  align-items: flex-start;
  gap: $spacing-3;
  margin-bottom: $spacing-3;
  padding-bottom: $spacing-3;
  border-bottom: 1px solid var(--border-light);

  &__fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }
}

.adresse-view {
  padding: $spacing-3 0;
  border-bottom: 1px solid var(--border-light);

  &:last-of-type {
    border-bottom: none;
  }

  &__nom {
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    font-size: $font-size-sm;
  }

  &__texte {
    margin: $spacing-1 0 0 0;
    font-size: $font-size-sm;
    color: var(--text-secondary);
    white-space: pre-line;
  }
}

// Notes
.notes-textarea {
  width: 100%;
  resize: vertical;
}

.notes-view {
  font-size: $font-size-sm;
  color: var(--text-primary);
  white-space: pre-line;
  margin: 0;
}
</style>
