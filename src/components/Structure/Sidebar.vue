<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <aside class="sidebar" :class="{ 'sidebar--open': isMobileOpen }">
    <!-- Header avec Logo -->
    <div class="sidebar__header">
      <RouterLink to="/" class="sidebar__logo" @click="closeMobile">
        <img src="@/assets/Logo_revaw.png" alt="Revaw ERP" />
      </RouterLink>
    </div>

    <!-- Navigation -->
    <nav class="sidebar__nav">
      <ul class="sidebar__menu">
        <li>
          <RouterLink to="/" class="sidebar__link" @click="closeMobile">
            <FontAwesomeIcon class="sidebar__icon" :icon="['fas', 'house']" />
            <span>Accueil</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/allBatteries" class="sidebar__link" @click="closeMobile">
            <FontAwesomeIcon class="sidebar__icon" :icon="['fas', 'car-battery']" />
            <span>Production</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/sav" class="sidebar__link" @click="closeMobile">
            <FontAwesomeIcon class="sidebar__icon" :icon="['fas', 'heart-pulse']" />
            <span>SAV</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/dashboard-spareparts" class="sidebar__link" @click="closeMobile">
            <FontAwesomeIcon class="sidebar__icon" :icon="['fas', 'puzzle-piece']" />
            <span>Pièces Détachées</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/" class="sidebar__link" @click="closeMobile">
            <FontAwesomeIcon class="sidebar__icon" :icon="['fas', 'chart-pie']" />
            <span>Statistiques</span>
          </RouterLink>
        </li>
        <li v-if="authStore.isSuperAdmin">
          <RouterLink
            to="/admin/users"
            class="sidebar__link sidebar__link--admin"
            @click="closeMobile"
          >
            <FontAwesomeIcon class="sidebar__icon" :icon="['fas', 'users-gear']" />
            <span>Gestion Utilisateurs</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Footer avec Theme Toggle -->
    <div class="sidebar__footer">
      <!-- Theme Toggle -->
      <button
        class="sidebar__theme-toggle"
        @click="themeStore.toggleTheme"
        :title="themeStore.theme === 'dark' ? 'Mode clair' : 'Mode sombre'"
      >
        <FontAwesomeIcon :icon="['fas', themeStore.theme === 'dark' ? 'sun' : 'moon']" />
        <span>{{ themeStore.theme === 'dark' ? 'Mode clair' : 'Mode sombre' }}</span>
      </button>

      <!-- Logout -->
      <button v-if="authStore.isAuthenticated" class="sidebar__logout" @click="handleLogout">
        <FontAwesomeIcon class="sidebar__icon" :icon="['fas', 'right-from-bracket']" />
        <span>Déconnexion</span>
      </button>
    </div>
  </aside>

  <!-- Mobile Overlay -->
  <div v-if="isMobileOpen" class="sidebar-overlay" @click="closeMobile"></div>

  <!-- Mobile Toggle Button -->
  <button class="sidebar-toggle" @click="toggleMobile">
    <FontAwesomeIcon :icon="['fas', isMobileOpen ? 'xmark' : 'bars']" />
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useThemeStore } from '@/stores/theme.js'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isMobileOpen = ref(false)

const toggleMobile = () => {
  isMobileOpen.value = !isMobileOpen.value
}

const closeMobile = () => {
  isMobileOpen.value = false
}

const handleLogout = () => {
  authStore.logout()
  closeMobile()
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 260px;
  height: 100vh;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition:
    transform $transition-slow,
    background-color $transition-base;

  @media (max-width: $breakpoint-lg) {
    transform: translateX(-100%);

    &--open {
      transform: translateX(0);
    }
  }

  &__header {
    padding: $spacing-5 $spacing-4;
    border-bottom: 1px solid var(--sidebar-border);
  }

  &__logo {
    display: flex;
    align-items: center;
    text-decoration: none;

    img {
      height: 36px;
      width: auto;
    }
  }

  &__nav {
    flex: 1;
    overflow-y: auto;
    padding: $spacing-3 0;
  }

  &__menu {
    list-style: none;
    padding: 0 $spacing-2;
    margin: 0;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3 $spacing-4;
    margin: $spacing-1 0;
    border-radius: $radius-md;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    transition: all $transition-fast;

    &:hover {
      background-color: var(--sidebar-hover);
      color: var(--text-primary);
    }

    &.router-link-active,
    &.router-link-exact-active {
      background-color: var(--sidebar-active);
      color: var(--text-primary);
    }

    &--admin {
      margin-top: $spacing-4;
      padding-top: $spacing-4;
      border-top: 1px solid var(--sidebar-border);
      border-radius: 0 0 $radius-md $radius-md;
    }
  }

  &__icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  &__footer {
    padding: $spacing-4;
    border-top: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__theme-toggle {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3 $spacing-4;
    border-radius: $radius-md;
    background-color: transparent;
    color: var(--text-secondary);
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;
    border: none;
    width: 100%;
    text-align: left;

    &:hover {
      background-color: var(--sidebar-hover);
      color: var(--text-primary);
    }
  }

  &__logout {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3 $spacing-4;
    border-radius: $radius-md;
    background-color: transparent;
    color: var(--color-error);
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;
    border: none;
    width: 100%;
    text-align: left;

    &:hover {
      background-color: var(--color-error-bg);
    }
  }
}

// Mobile Overlay
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-overlay);
  z-index: 99;

  @media (min-width: $breakpoint-lg) {
    display: none;
  }
}

// Mobile Toggle Button
.sidebar-toggle {
  position: fixed;
  top: $spacing-4;
  left: $spacing-4;
  width: 44px;
  height: 44px;
  border-radius: $radius-md;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 101;
  transition: all $transition-fast;
  box-shadow: $shadow-sm;

  &:hover {
    background-color: var(--bg-hover);
  }

  @media (max-width: $breakpoint-lg) {
    display: flex;
  }
}
</style>
