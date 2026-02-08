/**
 * Retourne true si l'app tourne dans Tauri, false dans un navigateur classique.
 */
export const isTauri = () => Boolean(window.__TAURI_INTERNALS__)
