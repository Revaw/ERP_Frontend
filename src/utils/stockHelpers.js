/**
 * @file stockHelpers.js
 * @description Fonctions utilitaires pour l'affichage et la gestion des stocks.
 */

/**
 * Formate l'affichage de la localisation pour un mouvement.
 * Gère les deux cas :
 * 1. Transfert : Affiche "Source → Destination"
 * 2. Simple : Affiche "Lieu unique"
 * * @param {Object} movement - L'objet mouvement de stock
 * @returns {String} Le texte formaté (ex: "REVAW → TOTO" ou "REVAW")
 */
export function getLocationDisplay(movement) {
  if (movement.from_location && movement.to_location) {
    return `${movement.from_location} → ${movement.to_location}`
  }
  return movement.location || '-'
}
