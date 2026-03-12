<template>
  <button class="btn-export" :disabled="loading" @click="handleExport" :title="title">
    <FontAwesomeIcon :icon="['fas', loading ? 'spinner' : 'file-export']" :spin="loading" />
    {{ loading ? 'Export...' : label }}
  </button>
</template>

<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'

const props = defineProps({
  // Fonction async appelée pour récupérer TOUTES les données (sans pagination)
  fetchFn: {
    type: Function,
    required: true,
  },
  // Nom du fichier sans extension
  filename: {
    type: String,
    default: 'export',
  },
  // Libellé du bouton
  label: {
    type: String,
    default: 'Exporter Excel',
  },
  title: {
    type: String,
    default: 'Exporter en Excel',
  },
  // Colonnes à exporter : [{ key: 'champObjet', label: 'En-tête Excel' }]
  // Si vide, toutes les clés du premier objet sont utilisées
  columns: {
    type: Array,
    default: () => [],
  },
})

const loading = ref(false)

async function handleExport() {
  loading.value = true
  try {
    const data = await props.fetchFn()

    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter.')
      return
    }

    // Construire les lignes selon les colonnes définies (ou toutes les clés)
    let rows
    if (props.columns.length > 0) {
      rows = data.map((item) => {
        const row = {}
        props.columns.forEach(({ key, label }) => {
          row[label] = item[key] ?? ''
        })
        return row
      })
    } else {
      rows = data
    }

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export')

    const date = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `${props.filename}_${date}.xlsx`)
  } catch (err) {
    console.error('Erreur export Excel:', err)
    alert("Erreur lors de l'export.")
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.btn-export {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  border: 1px solid var(--color-success);
  border-radius: $radius-md;
  background: transparent;
  color: var(--color-success);
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background-color: var(--color-success-bg);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
