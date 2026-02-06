<template>
  <div class="login">
    <div class="login__card">
      <div class="login__logo">
        <img src="@/assets/Logo_revaw.png" alt="Logo Revaw" />
      </div>
      <div class="login__hearder">
        <h1>Connexion ERP</h1>
        <p>Accédez à votre espace ERP</p>
      </div>
      <!-- Formulaire de connexion -->
      <form @submit.prevent="handleLogin" class="login__form">
        <!-- Identifiant -->
        <div class="form-group">
          <label for="username">Identifiant</label>
          <input
            id="username"
            type="text"
            v-model="form.username"
            required
            autofocus
            placeholder="Entrez votre identifiant"
          />
        </div>
        <!-- Mot de passe -->
        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            v-model="form.password"
            required
            placeholder="Entrez votre mot de passe"
          />
        </div>
        <!-- Message d'erreur -->
        <p v-if="errorMsg" class="login__error">
          <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
          {{ errorMsg }}
        </p>
        <!-- Bouton de connexion -->
        <button type="submit" class="btn-primary btn--full" :disabled="loading">
          <span v-if="loading">Connexion en cours...</span>
          <span v-else><FontAwesomeIcon :icon="['fas', 'right-from-bracket']" /> Se connecter</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter() // Instanciation du routeur
const authStore = useAuthStore() // Instanciation du store

const form = ref({ username: '', password: '' }) // Etat local du formulaire
const errorMsg = ref('') // Etat local du message d'erreur
const loading = ref(false) // Etat local de chargement

/**
 * @description Fonction de traitement du formulaire de connexion
 */
const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    await authStore.login(form.value)
    // Le routeur (Guard) gére la redirection vers /change-password si besoin
    router.push('/')
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 404) {
      errorMsg.value = 'Identifiant ou mot de passe incorrect.'
    } else {
      errorMsg.value = 'Erreur de connexion au serveur.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: $spacing-4;
  background-color: var(--bg-secondary);

  &__card {
    @include card($spacing-8);
    width: 100%;
    max-width: 420px;
    animation: slideUp $transition-slow ease-out;

    @media (max-width: $breakpoint-sm) {
      padding: $spacing-6;
    }
  }

  &__logo {
    display: flex;
    justify-content: center;
    margin-bottom: $spacing-6;

    img {
      height: 48px;
      width: auto;
    }
  }

  &__header {
    text-align: center;
    margin-bottom: $spacing-6;

    h1 {
      font-size: $font-size-2xl;
      font-weight: $font-weight-bold;
      color: var(--text-primary);
      margin-bottom: $spacing-2;
    }

    p {
      font-size: $font-size-sm;
      color: var(--text-secondary);
      margin: 0;
    }
  }
  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__error {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background-color: var(--color-error-bg);
    color: var(--color-error);
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    border-radius: $radius-md;
    margin: 0;
  }
}
.btn--full {
  width: 100%;
  justify-content: center;
  padding: $spacing-3 $spacing-4;
  font-size: $font-size-base;
  margin-top: $spacing-2;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
