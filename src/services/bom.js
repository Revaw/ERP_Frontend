/**
 * @file bom.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des BOM.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/bom`

// Récupérer toutes les BOM (actives + historiques)
export async function getAllBOMs() {
  try {
    const res = await axios.get(API_URL)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getAllBOMs:', err)
    throw err
  }
}

/**
 * Récupérer la BOM active pour un type de batterie
 * @param {String} batteryType (A, B, C, D...)
 */
export async function getActiveBOMByType(batteryType) {
  try {
    const res = await axios.get(`${API_URL}/active/${batteryType}`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getActiveBOMByType:', err)
    throw err
  }
}

/**
 * Créer une nouvelle BOM
 * ⚠️ Désactive automatiquement l'ancienne BOM active du même type
 * @param {Object} data
 */
export async function createBOM(data) {
  try {
    const res = await axios.post(API_URL, data)
    return res.data.data
  } catch (err) {
    console.error('Erreur API createBOM:', err)
    throw err
  }
}

/**
 * Désactiver une BOM (soft delete)
 * @param {String} bomId
 */
export async function deactivateBOM(bomId) {
  try {
    const res = await axios.patch(`${API_URL}/${bomId}/deactivate`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API deactivateBOM:', err)
    throw err
  }
}

/**
 * Remplacer une BOM
 */
export async function replaceBOM(id, payload) {
  const res = await axios.post(`${API_URL}/${id}/replace`, payload)
  return res.data.data
}
