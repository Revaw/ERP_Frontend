import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 1. On importe TOUTES les vues en haut du fichier
import LoginView from '@/views/LoginView.vue'
import ChangePasswordView from '@/views/ChangePasswordView.vue'
import HomeView from '@/views/HomeView.vue'
import ShowAllBatteriesView from '@/views/Batterie-views/ShowAllBatteriesView.vue'
import ShowSavBatteriesView from '@/views/Batterie-views/ShowSavBatteriesView.vue'
import BatterieDetailsView from '@/views/Batterie-views/BatterieDetailsView.vue'
import DashBoardSParepartsView from '@/views/Spare-parts/DashBoardSParepartsView.vue'
import SparePartsListView from '@/views/Spare-parts/SparePartsListView.vue'
import MovementFormView from '@/views/Spare-parts/MovementFormView.vue'
import StockListView from '@/views/Spare-parts/StockListView.vue'
import MovementListView from '@/views/Spare-parts/MovementListView.vue'
import AdminLocationsView from '@/views/Admin/AdminLocationsView.vue'
import AdminBomView from '@/views/Admin/AdminBomView.vue'
import AdminBomDetailsView from '@/views/Admin/AdminBomDetailsView.vue'
import InventoryView from '@/views/Spare-parts/InventoryView.vue'
import AdminUsersView from '@/views/Admin/AdminUsersView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView, // Déjà statique, on ne change rien
      meta: { public: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: ChangePasswordView, // On remplace la fonction () => import(...) par le composant
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/allBatteries',
      name: 'all-batteries',
      component: ShowAllBatteriesView,
    },
    {
      path: '/sav',
      name: 'sav',
      component: ShowSavBatteriesView,
    },
    {
      path: '/battery/:serial',
      name: 'BatteryDetails',
      component: BatterieDetailsView,
      props: true,
    },
    {
      path: '/dashboard-spareparts',
      name: 'dashboard-spareparts',
      component: DashBoardSParepartsView,
    },
    {
      path: '/spare-parts/list',
      name: 'spare-parts-list',
      component: SparePartsListView,
    },
    {
      path: '/stock/movement/form',
      name: 'stock-movement-form',
      component: MovementFormView,
    },
    {
      path: '/stock/list/:location',
      name: 'stock-list-location',
      component: StockListView,
      props: true,
    },
    {
      path: '/stock/movement/list',
      name: 'stock-movements',
      component: MovementListView,
    },
    {
      path: '/admin/locations',
      name: 'admin-locations',
      component: AdminLocationsView,
    },
    {
      path: '/admin/bom',
      name: 'admin-bom',
      component: AdminBomView,
    },
    {
      path: '/admin/bom/:id',
      name: 'admin-bom-details',
      component: AdminBomDetailsView,
      props: true,
    },
    {
      path: '/inventory/:location',
      name: 'inventory',
      component: InventoryView,
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: { roles: ['superadmin'] },
    },
  ],
})

/**
 * @description Guard global de navigation.
 * Vérifie le token, le mot de passe temporaire ET les rôles.
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 1. Si la route n'est pas publique et que l'utilisateur n'est pas connecté
  if (!to.meta.public && !authStore.isAuthenticated) {
    return next({ name: 'login' })
  }

  // 2. Si l'utilisateur est connecté mais a un mot de passe temporaire
  if (authStore.isAuthenticated && authStore.isPasswordTemporary) {
    // On bloque tout sauf la page de changement de mot de passe
    if (to.name !== 'change-password') {
      return next({ name: 'change-password' })
    }
  }

  // 3. Si l'utilisateur est connecté et tente d'accéder au login
  if (authStore.isAuthenticated && to.name === 'login') {
    return next({ name: 'home' })
  }

  // 4. Vérification des rôles (RBAC)
  // Si la route exige des rôles spécifiques et que l'utilisateur n'a pas le bon rôle
  if (to.meta.roles && !to.meta.roles.includes(authStore.userRole)) {
    // Redirection vers l'accueil
    return next({ name: 'home' })
  }

  next()
})

export default router
