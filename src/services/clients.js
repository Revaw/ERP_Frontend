/**
 * @file clients.js
 * @description Appels API du référentiel clients (distributeurs/revendeurs).
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/clients`

// Liste tous les clients (actifs et inactifs)
export async function getAllClients() {
  const res = await axios.get(API_URL)
  return res.data.data
}

// Fiche d'un client par slug
export async function getClientBySlug(slug) {
  const res = await axios.get(`${API_URL}/${slug}`)
  return res.data.data
}

/**
 * Créer un client.
 * ⚠️ Le slug est définitif : c'est la clé de jointure avec Battery.client,
 * User.tenantId et Device.tenantId (+ la liste clients de l'UI atelier).
 */
export async function createClient(data) {
  const res = await axios.post(API_URL, data)
  return res.data.data
}

// Modifier nom / statut / conditions commerciales (jamais le slug)
export async function updateClient(slug, data) {
  const res = await axios.put(`${API_URL}/${slug}`, data)
  return res.data.data
}

// Comptes d'accès aux données rattachés à ce client
export async function getClientAccounts(slug) {
  const res = await axios.get(`${API_URL}/${slug}/accounts`)
  return res.data.data
}
