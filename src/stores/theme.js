import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // Récupère le thème sauvegardé ou utilise la préférence système
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('revaw-theme')
    if (savedTheme) {
      return savedTheme
    }
    // Détection de la préférence système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  const theme = ref(getInitialTheme())

  // Applique le thème au document
  const applyTheme = (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('revaw-theme', newTheme)
  }

  // Toggle entre les thèmes
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  // Définir un thème spécifique
  const setTheme = (newTheme) => {
    if (['light', 'dark'].includes(newTheme)) {
      theme.value = newTheme
    }
  }

  // Computed pour savoir si on est en dark mode
  const isDark = () => theme.value === 'dark'

  // Watch pour appliquer le thème quand il change
  watch(
    theme,
    (newTheme) => {
      applyTheme(newTheme)
    },
    { immediate: true },
  )

  return {
    theme,
    toggleTheme,
    setTheme,
    isDark,
  }
})
