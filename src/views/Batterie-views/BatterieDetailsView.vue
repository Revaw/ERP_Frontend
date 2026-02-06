<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">Détails de la batterie</h1>
    </div>

    <BatteryDetailsInfo
      v-if="battery"
      :battery="battery"
      :loading="loading"
      @refresh="fetchBatteryDetails"
    />

    <div v-if="error" class="error-state">
      <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
// Composants UI & Métier
import BatteryDetailsInfo from '@/components/batteries/BatteryDetailsInfo.vue'
import ButtonBack from '@/components/ui/ButtonBack.vue'
// Services API
import { getBatteryBySerial } from '@/services/batteries.js'

// --- CONFIGURATION DU ROUTEUR ---
const route = useRoute() // permet de lire les paramètres de l'URL (:serial)

// --- ÉTAT RÉACTIF ---
const battery = ref(null) // stock les données de la batterie
const loading = ref(true) // gére l'état de chargement
const error = ref(null) // stocke les messages d'erreur

/**
 * @description Orchestre le chargement des données de la batterie.
 * * 1. Active l'état de chargement.
 * 2. Récupère le numéro de série depuis l'URL (route.params).
 * 3. Appelle le service API.
 * 4. Gère les erreurs spécifiques (404 Not Found vs Erreur serveur).
 * 5. Désactive l'état de chargement dans tous les cas (finally).
 */
const fetchBatteryDetails = async () => {
  try {
    // Début du chargement : on masque le contenu précédent
    loading.value = true
    // Extraction du paramètre dynamique de l'URL
    const serial = route.params.serial
    // Récupérer les données de la batterie
    battery.value = await getBatteryBySerial(serial)
    console.log('battery.value', battery.value)
  } catch (err) {
    console.error('Erreur fetchBatteryDetails :', err)
    if (err.response?.status === 404) {
      error.value = `Batterie "${route.params.serial}" non trouvée`
    } else {
      error.value = 'Erreur lors du chargement des détails de la batterie'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBatteryDetails()
})
</script>

<style lang="scss" scoped>
.error-state {
  @include card;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-12;
  text-align: center;
  color: var(--color-error);
  gap: $spacing-3;

  svg {
    font-size: 48px;
    opacity: 0.5;
  }

  p {
    font-size: $font-size-base;
    margin: 0;
  }
}
</style>
