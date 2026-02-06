/**
 * @file stock.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des stocks.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/stocks`

// Créer un mouvement de stock
export async function createMovement(payload) {
  try {
    const res = await axios.post(`${API_URL}/movement`, payload)
    return res.data
  } catch (err) {
    console.error('Erreur API createMovement:', err)
    throw err
  }
}

/**
 * Récupère le stock filtré par emplacement.
 * @param {String} location - Code de l'emplacement (ex: REVAW)
 * @returns {Promise<Array<Object>>} Tableau des stocks (pièces avec quantité)
 */
export async function getFilteredStocks(location) {
  try {
    const res = await axios.get(`${API_URL}`, { params: { location } })
    return res.data.data
  } catch (err) {
    console.error('Erreur API getFilteredStocks:', err)
    throw err
  }
}

// Historique paginé des mouvements avec filtres
export async function getMovementsPaginated(params = {}) {
  try {
    const types = []
    if (params.in) types.push('in')
    if (params.out) types.push('out')
    if (params.transfer) types.push('transfer')

    const res = await axios.get(`${API_URL}/movements`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 50,
        sku: params.sku || undefined,
        types: types.length > 0 ? types.join(',') : undefined,
        source: params.source || undefined,
        dateStart: params.dateStart || undefined,
        dateEnd: params.dateEnd || undefined,
      },
    })
    return res.data
  } catch (err) {
    console.error('Erreur API getMovementsPaginated:', err)
    throw err
  }
}

// 10 derniers mouvements
export async function getRecentMovements() {
  try {
    const res = await axios.get(`${API_URL}/movements/recent`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getRecentMovements:', err)
    throw err
  }
}

export async function getAllSparePartWithStock() {
  try {
    const res = await axios.get(`${API_URL}/catalog`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getAllSparePartWithStock:', err)
    throw err
  }
}
