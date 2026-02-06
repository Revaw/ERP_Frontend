/**
 * @file locations.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des locations.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/locations`

// Récupérer toutes les locations (lieus de stockages)
export async function getAllLocations() {
  try {
    const res = await axios.get(`${API_URL}`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getAllLocations:', err)
    throw err
  }
}

// Créer une nouvelle location
export async function createLocation(data) {
  try {
    const res = await axios.post(API_URL, data)
    return res.data.data
  } catch (err) {
    console.error('Erreur API createLocation:', err)
    throw err
  }
}

// Modifier une location
export async function updateLocation(name, data) {
  try {
    const res = await axios.put(`${API_URL}/${name}`, data)
    return res.data.data
  } catch (err) {
    console.error('Erreur API updateLocation:', err)
    throw err
  }
}

// Désactiver une location
export async function deactivateLocation(code) {
  const res = await axios.patch(`${API_URL}/${code}`)
  return res.data
}
