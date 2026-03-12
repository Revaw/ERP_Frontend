/**
 * @file sav.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des interventions SAV.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/sav`

// Récupérer toutes les demandes SAV en cours (vue ERP)
export async function getSavRequests() {
  try {
    const res = await axios.get(`${API_URL}/requests`)
    return res.data
  } catch (err) {
    console.error('Erreur API getSavRequests:', err)
    throw err
  }
}

// Récupérer l'intervention active (données techniques)
export async function getActiveIntervention(serial) {
  try {
    const res = await axios.get(`${API_URL}/${serial}/active`)
    return res.data.intervention
  } catch (err) {
    console.error('Erreur API getActiveIntervention:', err)
    throw err
  }
}

// Historique paginé des interventions SAV
export async function getSavHistory(page = 1, limit = 20, filters = {}) {
  try {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('limit', limit)
    if (filters.serial) params.append('serial', filters.serial)
    if (filters.status) params.append('status', filters.status)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.all) params.append('all', 'true')

    const res = await axios.get(`${API_URL}/history?${params.toString()}`)
    return res.data
  } catch (err) {
    console.error('Erreur API getSavHistory:', err)
    throw err
  }
}

// Sauvegarder l'intervention
export async function saveIntervention(serial, payload) {
  try {
    const res = await axios.post(`${API_URL}/${serial}/save`, payload)
    return res.data
  } catch (err) {
    console.error('Erreur API saveIntervention:', err)
    throw err
  }
}
