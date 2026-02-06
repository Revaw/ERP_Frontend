import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]) // Liste des notifications actives

  // Ajouter une notification
  const add = (message, type = 'info', duration = 3000) => {
    const id = Date.now() // ID unique

    toasts.value.push({ id, message, type })

    // Suppression automatique après le délai
    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
  }

  // Supprimer une notification spécifique
  const remove = (id) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  // Raccourcis pratiques
  const success = (msg, duration) => add(msg, 'success', duration)
  const error = (msg, duration) => add(msg, 'error', duration)
  const info = (msg, duration) => add(msg, 'info', duration)

  return { toasts, add, remove, success, error, info }
})
