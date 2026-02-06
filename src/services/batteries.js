/**
 * @file batteries.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des batteries.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/batteries`

/**
 * Récupère TOUTES les batteries.
 * @returns {Promise<Array<Object>>} Tableau complet des batteries
 */
export async function getAllBatteries() {
  try {
    const res = await axios.get(`${API_URL}?all=true`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getAllBatteries:', err)
    throw err
  }
}

/**
 * Récupère les batteries de manière paginée.
 * @param {Number} page - Numéro de page (1-indexed)
 * @param {Number} limit - Nombre d'éléments par page
 * @param {Object} filters - Filtres actifs
 * @returns {Promise<{data: Array, page: Number, totalPages: Number, total: Number}>} Objet de pagination complet
 */
export async function getBatteriesPaginated(page = 1, limit = 100, filters = {}) {
  try {
    // Construire les paramètres de la query string
    const params = new URLSearchParams({
      page,
      limit,
    })

    // Ajouter les filtres s'ils sont définis
    if (filters.prod !== undefined) params.append('prod', filters.prod)
    if (filters.exp !== undefined) params.append('exp', filters.exp)
    if (filters.sav !== undefined) params.append('sav', filters.sav)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.wait) params.append('wait', filters.wait)
    if (filters.isCanceled !== undefined) params.append('isCanceled', filters.isCanceled)
    if (filters.kwh) params.append('kwh', filters.kwh)

    const response = await axios.get(`${API_URL}?${params.toString()}`)
    return response.data
  } catch (err) {
    console.error('Erreur API getBatteriesPaginated:', err)
    throw err
  }
}

// Recupere les statistiques de production
export async function getBatteryStats() {
  try {
    const res = await axios.get(`${API_URL}/stats`)
    return res.data
  } catch (err) {
    console.error('Erreur API getBatteryStats:', err)
    throw err
  }
}

// Recupere les batteries en SAV
export async function getSavBatteries() {
  try {
    const res = await axios.get(`${API_URL}/sav`)
    return res.data
  } catch (err) {
    console.error('Erreur API getSavBatteries:', err)
    throw err
  }
}

// Recupere une batterie par son serial
export async function getBatteryBySerial(serial) {
  const res = await axios.get(`${API_URL}/battery/${serial}`)
  return res.data
}

// met a jour une batterie en SAV
export async function updateSavEntry(serial, data) {
  return axios.post(`${API_URL}/battery/${serial}/sav`, data)
}

// ajoute ou met a jour un commentaire
export async function addOrUpdateCommentary(serial, data) {
  return axios.post(`${API_URL}/battery/${serial}/commentary`, data)
}

// Recupere les expéditions mensuelles
export async function getMonthlyExpeditions() {
  try {
    const res = await axios.get(`${API_URL}/monthly-expeditions`)
    return res.data
  } catch (err) {
    console.error('Erreur API getMonthlyExpeditions:', err)
    throw err
  }
}

// Met a jour l'annulation d'une batterie
export async function updateBatteryCancellation(serial, isCanceled) {
  // On envoie le booléen souhaité dans le body
  const res = await axios.post(`${API_URL}/battery/${serial}/cancel-status`, { isCanceled })
  return res.data
}

// Met a jour l'annulation de la garantie d'une batterie
export async function updateWarrantyRevocation(serial, isRevoked) {
  const res = await axios.post(`${API_URL}/battery/${serial}/warranty-revocation`, { isRevoked })
  return res.data
}

// Met à jour la version de la batterie
export const updateBatteryVersion = async (serial, data) => {
  const response = await axios.post(`${API_URL}/battery/${serial}/version`, data)
  return response.data
}
