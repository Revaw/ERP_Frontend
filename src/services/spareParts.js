/**
 * @file spareParts.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des stocks.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/spare-parts`

// Recupere toutes les spare parts
export async function getAllSpareParts() {
  try {
    const res = await axios.get(`${API_URL}`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getAllSpareParts:', err)
    throw err
  }
}

// Créer une nouvelle spare part
export async function createSparePart(data) {
  try {
    const res = await axios.post(API_URL, data)
    return res.data.data
  } catch (err) {
    console.error('Erreur API createSparePart:', err)
    throw err
  }
}

// Modifier une spare part
export async function updateSparePart(sku, data) {
  try {
    const res = await axios.put(`${API_URL}/${sku}`, data)
    return res.data.data
  } catch (err) {
    console.error('Erreur API updateSparePart:', err)
    throw err
  }
}

// Supprimer une spare part (possible uniquement si les stocks sont vides (dans chaque location))
export async function deleteSparePart(sku) {
  try {
    const res = await axios.delete(`${API_URL}/${sku}`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API deleteSparePart:', err)
    throw err
  }
}

// Récupérer les pièces inactives (archives)
export async function getInactiveSpareParts() {
  try {
    const res = await axios.get(`${API_URL}/inactive`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getInactiveSpareParts:', err)
    throw err
  }
}

// Réactiver une pièce
export async function reactivateSparePart(sku) {
  try {
    const res = await axios.patch(`${API_URL}/${encodeURIComponent(sku)}/reactivate`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API reactivateSparePart:', err)
    throw err
  }
}
