/**
 * @file batteryHelpers.js
 * @description Fonctions utilitaires pures pour le traitement des données batteries.
 * Ces fonctions ne dépendent pas de l'état de Vue et peuvent être réutilisées partout.
 */
import { formatDate } from '@/utils/formatDate.js'
/**
 * Détermine le libellé textuel du statut d'une batterie selon ses propriétés.
 * @param {Object} battery - L'objet batterie
 * @returns {String} Le libellé (Annulée, SAV, Expédiée, En stock, En production)
 */
export function getStatusText(battery) {
  if (battery.isCanceled) return 'Annulée'
  if (battery.sav_status) return 'SAV'
  if (battery.TimestampExpedition) return 'Expédiée'
  if (battery.TimestampTestDone) return 'En stock'
  return 'En production'
}

/**
 * Détermine la variante de couleur (classe CSS) du tag de statut.
 * @param {Object} battery - L'objet batterie
 * @returns {String} La classe du tag (red-tag, green-tag, etc.)
 */
export function getStatusVariant(battery) {
  if (battery.sav_status || battery.isCanceled) return 'red-tag'
  if (battery.TimestampExpedition) return 'green-tag'
  if (battery.TimestampTestDone) return 'blue-tag'
  return 'yellow-tag'
}

/**
 * Extrait la capacité (kWh) depuis le numéro de série via une Regex.
 * @param {Object} battery - L'objet batterie contenant NumeroSerie
 * @returns {String} La capacité formatée (ex: "13 kWh") ou "N/A"
 */
export function getBatteryKwh(battery) {
  const serial = battery.NumeroSerie || ''
  // Regex pour capturer les ampères après "48v" (insensible à la casse)
  const match = serial.match(/48v(\d{3})/i)

  if (!match) return 'N/A'

  const ah = Number(match[1])

  switch (ah) {
    case 271:
      return '13 kWh'
    case 250:
      return '12 kWh'
    case 175:
      return '8.4 kWh'
    default:
      return 'N/A'
  }
}

/**
 * Récupère la dernière entrée (la plus récente) de l'historique SAV d'une batterie.
 * @param {Object} battery - L'objet batterie
 * @returns {Object|null} La dernière entrée ou null si historique vide
 */
export function getLastSavEntry(battery) {
  const history = battery.sav_history
  if (!history || history.length === 0) return null
  return history[history.length - 1]
}

/**
 * Calcule le nombre de jours écoulés depuis la dernière arrivée en SAV.
 * @param {Object} battery - L'objet batterie
 * @returns {Number} Nombre de jours (entier)
 */
export function getDaysSinceSavArrival(battery) {
  const last = getLastSavEntry(battery)
  if (!last) return 0

  const arrivee = new Date(last.date_arrivee)
  const now = new Date()

  // Différence en millisecondes convertie en jours
  return Math.floor((now - arrivee) / (1000 * 60 * 60 * 24))
}

/**
 * Détermine le libellé SAV spécifique pour l'affichage (En cours vs En stock).
 * @param {Object} battery - L'objet batterie
 * @returns {String} "En stock" (si réparée mais pas partie) ou "En cours"
 */
export function getSavStatusText(battery) {
  const lastEntry = getLastSavEntry(battery)
  if (!lastEntry) return 'SAV'

  // Si réparée mais pas de date_depart => Elle est physiquement "En stock" (prête)
  if (lastEntry.status === 'réparée' && !lastEntry.date_depart) {
    return 'En stock'
  }

  // Sinon => Toujours en cours de diagnostic ou réparation
  return 'En cours'
}

/**
 * Détermine la couleur du tag pour le SAV.
 * @param {Object} battery
 * @returns {String} 'blue-tag' (prête) ou 'red-tag' (problème en cours)
 */
export function getSavStatusVariant(battery) {
  const lastEntry = getLastSavEntry(battery)
  if (!lastEntry) return 'red-tag'

  // Si réparée et en attente de départ
  if (lastEntry.status === 'réparée' && !lastEntry.date_depart) {
    return 'blue-tag'
  }

  return 'red-tag'
}

/**
 * Détermine les dates clés à afficher sur la carte résumé d'une batterie.
 * Règle métier :
 * - Si expédiée : on affiche uniquement la date d'expédition (info finale).
 * - Sinon : on affiche le suivi de production (Création + Test).
 * * @param {Object} battery - L'objet batterie
 * @returns {Array<{label: String, value: String}>} Liste d'objets prêts pour l'affichage
 */
export function getBatteryDisplayDates(battery) {
  // Cas 1 : Batterie expédiée (Fin de cycle)
  if (battery.TimestampExpedition) {
    return [
      {
        label: 'Expédiée le',
        value: formatDate(battery.TimestampExpedition),
      },
    ]
  }

  // Cas 2 : En cours de production / En stock
  return [
    {
      label: 'Créée le',
      value: formatDate(battery.TimestampImpression),
    },
    {
      label: 'Test effectué le',
      value: formatDate(battery.TimestampTestDone),
    },
  ]
}
