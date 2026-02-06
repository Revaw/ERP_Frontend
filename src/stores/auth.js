/**
 * @file auth.js
 * @description Store Pinia pour la gestion de l'état d'authentification (Token, User, Rôles).
 */
import { defineStore } from 'pinia'
import axios from 'axios'
import { ref, computed } from 'vue'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/auth`

export const useAuthStore = defineStore('auth', () => {
  // État (State) initialisé depuis le localStorage pour persister après F5
  const token = ref(localStorage.getItem('token') || null)
  const userRole = ref(localStorage.getItem('role') || null)
  const username = ref(localStorage.getItem('username') || null)
  const scopes = ref(JSON.parse(localStorage.getItem('scopes')) || [])
  // Le backend renvoie ce booléen si le MDP doit être changé
  const isPasswordTemporary = ref(localStorage.getItem('isPasswordTemporary') === 'true')

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => ['superadmin', 'moderator'].includes(userRole.value))
  const isSuperAdmin = computed(() => userRole.value === 'superadmin')
  // Helper pour vérifier si l'utilisateur possède un scope spécifique
  const hasScope = (scope) => scopes.value.includes(scope)
  // getter pour savoir si l'utilisateur peut accéder au ERP
  const canAccessERP = computed(() => scopes.value.includes('ERP_USER'))
  // Configuration initiale d'Axios si un token est déjà présent
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  /**
   * @function login
   * @description Connecte l'utilisateur, stocke le token et configure Axios.
   * @param {Object} credentials - { username, password }
   */
  async function login(credentials) {
    try {
      const res = await axios.post(`${API_URL}/login`, credentials)
      const data = res.data
      // Si tu es sur l'app ERP, on rejette ceux qui n'ont pas le scope ERP_USER
      if (!data.scopes || !data.scopes.includes('ERP_USER')) {
        throw new Error('Accès refusé : Ce compte est réservé au portail prestataire.')
      }
      // Mise à jour du state
      token.value = res.data.token
      userRole.value = res.data.role
      username.value = res.data.username
      scopes.value = data.scopes || []
      isPasswordTemporary.value = res.data.isPasswordTemporary

      // Persistance
      localStorage.setItem('token', token.value)
      localStorage.setItem('role', userRole.value)
      localStorage.setItem('username', username.value)
      localStorage.setItem('scopes', JSON.stringify(scopes.value))
      localStorage.setItem('isPasswordTemporary', isPasswordTemporary.value)

      // Configuration globale Axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

      return true
    } catch (error) {
      console.error('Erreur Login:', error)
      throw error
    }
  }

  /**
   * @function logout
   * @description Déconnecte l'utilisateur et nettoie le stockage local.
   */
  function logout() {
    token.value = null
    userRole.value = null
    username.value = null
    scopes.value = []
    isPasswordTemporary.value = false

    localStorage.clear()
    delete axios.defaults.headers.common['Authorization']

    // Force le rechargement pour nettoyer la mémoire de l'app
    window.location.href = '/login'
  }

  /**
   * @function updatePassword
   * @description Met à jour le mot de passe et désactive le flag temporaire.
   */
  async function updatePassword(newPassword) {
    await axios.post(`${API_URL}/change-password`, { newPassword })
    isPasswordTemporary.value = false
    localStorage.setItem('isPasswordTemporary', 'false')
  }

  return {
    token,
    userRole,
    username,
    scopes,
    isPasswordTemporary,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    hasScope,
    canAccessERP,
    login,
    logout,
    updatePassword,
  }
})
