/**
 * @file modele.js
 * @description Appels API du référentiel des modèles de batterie.
 * Une fiche modèle porte les données fixes d'un modèle (13 kWh, 12 kWh...),
 * dont les données du passeport batterie UE 2023/1542.
 * Écriture réservée aux rôles superadmin / moderator (contrôlé côté backend).
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/modeles`

/**
 * Récupérer les fiches modèles
 * @param {Boolean} includeInactive - Inclure les fiches désactivées
 */
export async function getAllModeles(includeInactive = false) {
  try {
    const res = await axios.get(API_URL, {
      params: includeInactive ? { all: true } : {},
    })
    return res.data.data
  } catch (err) {
    console.error('Erreur API getAllModeles:', err)
    throw err
  }
}

/**
 * Récupérer une fiche modèle par son nom
 * @param {String} nom (ex: "RW-48V27113")
 */
export async function getModeleByNom(nom) {
  try {
    const res = await axios.get(`${API_URL}/${encodeURIComponent(nom)}`)
    return res.data.data
  } catch (err) {
    console.error('Erreur API getModeleByNom:', err)
    throw err
  }
}

/**
 * Créer une fiche modèle
 * @param {Object} data - nom, capaciteKwh et capaciteAh requis, le reste optionnel
 */
export async function createModele(data) {
  try {
    const res = await axios.post(API_URL, data)
    return res.data.data
  } catch (err) {
    console.error('Erreur API createModele:', err)
    throw err
  }
}

/**
 * Mettre à jour une fiche modèle
 * ⚠️ Le nom n'est pas modifiable (clé d'association des batteries)
 * Chaque champ modifié est tracé dans history[] côté backend
 * @param {String} nom
 * @param {Object} data - Champs à mettre à jour
 */
export async function updateModele(nom, data) {
  try {
    const res = await axios.put(`${API_URL}/${encodeURIComponent(nom)}`, data)
    return res.data.data
  } catch (err) {
    console.error('Erreur API updateModele:', err)
    throw err
  }
}

/**
 * Désactiver une fiche modèle (soft delete — jamais de suppression,
 * des batteries référencent son nom)
 * @param {String} nom
 */
export async function deactivateModele(nom) {
  try {
    const res = await axios.patch(`${API_URL}/${encodeURIComponent(nom)}/deactivate`)
    return res.data
  } catch (err) {
    console.error('Erreur API deactivateModele:', err)
    throw err
  }
}
