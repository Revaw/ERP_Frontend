/**
 * @file sav.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des interventions SAV.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/sav`

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
