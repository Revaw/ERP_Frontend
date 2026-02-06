/**
 * @file users.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des utilisateurs.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/auth`

/**
 * Récupère la liste de tous les utilisateurs.
 * @returns {Promise<Array<Object>>} Tableau d'objets utilisateurs
 */
export async function getAllUsers() {
  try {
    const res = await axios.get(`${API_URL}/users`)
    return res.data
  } catch (err) {
    console.error('Erreur API getAllUsers:', err)
    throw err
  }
}

/**
 * Crée un nouvel utilisateur.
 * @param {Object} data - { username, password, role }
 * @returns {Promise<Object>} Confirmation de création
 */
export async function createUser(data) {
  try {
    const res = await axios.post(`${API_URL}/register`, data)
    return res.data
  } catch (err) {
    console.error('Erreur API createUser:', err)
    throw err
  }
}

// Modifier un utilisateur
export async function updateUser(id, data) {
  try {
    const res = await axios.put(`${API_URL}/users/${id}`, data)
    return res.data
  } catch (err) {
    console.error('Erreur API updateUser:', err)
    throw err
  }
}

// Supprimer un utilisateur sauf l'admin principal
export async function deleteUser(id) {
  try {
    const res = await axios.delete(`${API_URL}/users/${id}`)
    return res.data
  } catch (err) {
    console.error('Erreur API deleteUser:', err)
    throw err
  }
}
