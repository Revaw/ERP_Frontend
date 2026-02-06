<script setup>
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import Sidebar from './components/Structure/Sidebar.vue'
import { useAuthStore } from './stores/auth.js'
import ToastContainer from './components/ui/ToastContainer.vue'
const route = useRoute()
const authStore = useAuthStore()

// Pages sans sidebar (login, etc.)
const noSidebarRoutes = ['/login', '/change-password']
const showSidebar = computed(() => {
  return authStore.isAuthenticated && !noSidebarRoutes.includes(route.path)
})
</script>

<template>
  <div id="app" :class="{ 'app--with-sidebar': showSidebar }">
    <!-- Sidebar -->
    <Sidebar v-if="showSidebar" />

    <!-- Main Content -->
    <main class="main-content">
      <router-view></router-view>
    </main>

    <!-- Notifications -->
    <ToastContainer />
  </div>
</template>

<style lang="scss">
#app {
  min-height: 100vh;
  background-color: var(--bg-secondary);
  transition: background-color $transition-base;
}

.main-content {
  min-height: 100vh;
  padding: $spacing-8;
  transition: margin-left $transition-slow;

  @media (max-width: $breakpoint-lg) {
    padding: $spacing-6;
    padding-top: calc($spacing-6 + 60px);
  }

  @media (max-width: $breakpoint-md) {
    padding: $spacing-4;
    padding-top: calc($spacing-4 + 60px);
  }
}

// Quand la sidebar est visible
.app--with-sidebar {
  .main-content {
    margin-left: $sidebar-width;

    @media (max-width: $breakpoint-lg) {
      margin-left: 0;
    }
  }
}
</style>
