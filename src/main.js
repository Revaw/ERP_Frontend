import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'

import App from './App.vue'
import router from './router'
import { FontAwesomeIcon } from '@/plugins/fontawesome.js'
import './assets/scss/main.scss'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('FontAwesomeIcon', FontAwesomeIcon)

// Configuration de l'intercepteur Axios global
const authStore = useAuthStore()

axios.interceptors.response.use(
  (response) => {
    // Si la requête réussit, on la passe telle quelle
    return response
  },
  (error) => {
    // Si on reçoit une erreur 401 (Non autorisé / Token expiré)
    if (error.response && error.response.status === 401) {
      // On déclenche la déconnexion (qui nettoie le localStorage et redirige vers /login)
      authStore.logout()
    }
    // On rejette l'erreur pour que les composants puissent gérer d'autres cas si besoin
    return Promise.reject(error)
  },
)
app.mount('#app')
