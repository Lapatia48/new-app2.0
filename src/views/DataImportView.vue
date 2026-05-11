<script setup>
import { ref } from 'vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { parseCsvFile } from '@/services/import/csvParser'
import { runImport } from '@/services/import/importService'

const rows = ref([])
const status = ref('')
const isRunning = ref(false)

async function onFileSelected(event) {
  const input = event.target
  const file = input && input.files ? input.files[0] : null
  rows.value = []
  status.value = ''
  if (!file) {
    return
  }
  const parsed = await parseCsvFile(file)
  rows.value = parsed.rows
  status.value = `CSV charge: ${rows.value.length} lignes`
}

async function startImport(target) {
  if (!rows.value.length) {
    status.value = 'Charge un fichier CSV d abord.'
    return
  }
  isRunning.value = true
  status.value = 'Import en cours...'
  runImport({ target, rows: rows.value })
    .then((summary) => {
      status.value = `Import termine: ${summary.success} OK.`
    })
    .catch((error) => {
      status.value = error.message
    })
    .finally(() => {
      isRunning.value = false
    })
}
</script>

<template>
  <div class="stack">
    <SectionHeader
      eyebrow="Import"
      title="Import CSV"
      subtitle="Importe produits ou categories via l API PrestaShop en XML uniquement."
    />

    <div class="panel">
      <label class="field">
        <span>Fichier CSV</span>
        <input type="file" accept=".csv,text/csv" @change="onFileSelected" />
      </label>
      <div class="actions">
        <button class="secondary" :disabled="isRunning" @click="startImport('products')">
          Import produits
        </button>
        <button class="secondary" :disabled="isRunning" @click="startImport('categories')">
          Import categories
        </button>
        <button class="secondary" :disabled="isRunning" @click="startImport('stocks')">
          Import stocks
        </button>
      </div>
      <p v-if="status" class="status">{{ status }}</p>
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel {
  background: var(--surface);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid var(--border);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.field input {
  border-radius: 6px;
  border: 1px solid var(--border);
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  background: #fff;
}

.actions {
  margin-top: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.primary {
  padding: 0.5rem 1.1rem;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.secondary {
  padding: 0.5rem 1.1rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin: 0.8rem 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}
</style>
