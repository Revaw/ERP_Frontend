<template>
  <div class="change-password">
    <div class="change-password__card">
      <div class="change-password__logo">
        <img src="@/assets/Logo_revaw.png" alt="Logo Revaw" />
      </div>

      <div class="change-password__header">
        <h1>Première connexion</h1>
        <p>
          Pour des raisons de sécurité, vous devez définir un nouveau mot de passe personnel avant
          d'accéder à l'application.
        </p>
      </div>

      <!-- Formulaire -->
      <form @submit.prevent="handleSubmit" class="change-password__form">
        <!-- Mot de passe -->
        <div class="form-group">
          <label for="password">Nouveau mot de passe</label>
          <input
            id="password"
            type="password"
            v-model="password"
            required
            minlength="6"
            placeholder="Entrez votre mot de passe"
            autofocus
          />
          <ul class="password-rules">
            <li :class="{ valid: pwdHasMinLength }">Au moins 6 caractères</li>
            <li :class="{ valid: pwdHasUppercase }">Une majuscule</li>
            <li :class="{ valid: pwdHasSpecialChar }">Un caractère spécial (!@#$%...)</li>
          </ul>
        </div>

        <!-- Confirmer le mot de passe -->
        <div class="form-group">
          <label for="confirmPassword">Confirmer le mot de passe</label>
          <input
            id="confirmPassword"
            type="password"
            v-model="confirmPassword"
            required
            placeholder="Répétez le mot de passe"
          />
        </div>

        <!-- Message d'erreur -->
        <p v-if="errorMsg" class="change-password__error">
          <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
          {{ errorMsg }}
        </p>

        <!-- Bouton de validation -->
        <button type="submit" class="btn-primary btn--full" :disabled="loading">
          <span v-if="loading">Mise à jour...</span>
          <span v-else>
            <FontAwesomeIcon :icon="['fas', 'check']" />
            Valider et accéder
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter() // Accès au router
const authStore = useAuthStore() // Accès au store

const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const loading = ref(false)

// Validation mot de passe
const pwdHasMinLength = computed(() => password.value.length >= 6)
const pwdHasUppercase = computed(() => /[A-Z]/.test(password.value))
const pwdHasSpecialChar = computed(() => /[!@#$%^&*(),.?:{}|<>]/.test(password.value))

/**
 * @description Fonction de traitement du formulaire de changement de mot de passe
 */
const handleSubmit = async () => {
  // Validation locale
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  if (password.value.length < 6) {
    errorMsg.value = 'Le mot de passe doit contenir au moins 6 caractères.'
    return
  }

  if (!/[A-Z]/.test(password.value)) {
    errorMsg.value = 'Le mot de passe doit contenir au moins une majuscule.'
    return
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password.value)) {
    errorMsg.value = 'Le mot de passe doit contenir au moins un caractère spécial.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    // Appel au store
    await authStore.updatePassword(password.value)

    // Redirection vers l'accueil (le Guard du router laissera passer maintenant)
    router.push('/')
  } catch (err) {
    console.error(err)
    errorMsg.value = err.response?.data?.message || 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.change-password {
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
      margin-bottom: $spacing-3;
    }

    p {
      font-size: $font-size-sm;
      color: var(--text-secondary);
      line-height: $line-height-relaxed;
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

.password-rules {
  margin: $spacing-2 0 0 0;
  padding-left: $spacing-4;
  list-style: none;

  li {
    font-size: $font-size-xs;
    color: var(--text-tertiary);
    margin-bottom: $spacing-1;
    display: flex;
    align-items: center;
    gap: $spacing-1;

    &::before {
      content: '○';
      font-size: 8px;
    }

    &.valid {
      color: var(--color-success);

      &::before {
        content: '●';
      }
    }
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
