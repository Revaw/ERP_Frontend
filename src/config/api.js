/**
 * @file api.js
 * @description Configuration centralisée de l'API.
 * Utilise la variable d'environnement VITE_API_URL si elle existe (prod),
 * sinon utilise localhost:3000 par défaut (dev).
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const API_BASE_URL = `${BASE}/api`
