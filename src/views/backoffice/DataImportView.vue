<script setup>
import { ref } from 'vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { parseCsvFile } from '@/services/import/csvParser'
import { runImport } from '@/services/import/importService'

const parsed = ref(null)
const rows = ref([])
const imageFiles = ref([])
const status = ref('')
const isRunning = ref(false)

async function onCsvSelected(event) {
  const input = event.target
  const file = input && input.files ? input.files[0] : null
  rows.value = []
  parsed.value = null
  status.value = ''
  if (!file) {
    return
  }
  const parsedFile = await parseCsvFile(file)
  parsed.value = parsedFile
  rows.value = parsedFile.rows
  status.value = `CSV charge: ${rows.value.length} lignes`
}

function onImagesSelected(event) {
  const input = event.target
  imageFiles.value = input && input.files ? Array.from(input.files) : []
  if (imageFiles.value.length) {
    status.value = `Images chargees: ${imageFiles.value.length}`
  }
}

async function startImport(target) {
  if (target === 'images') {
    if (!imageFiles.value.length) {
      status.value = 'Charge les images a importer.'
      return
    }
    isRunning.value = true
    status.value = 'Import images en cours...'
    runImport({ target, files: imageFiles.value })
      .then((summary) => {
        status.value = `Import images termine: ${summary.success} OK.`
      })
      .catch((error) => {
        status.value = error.message
      })
      .finally(() => {
        isRunning.value = false
      })
    return
  }

  if (!rows.value.length) {
    status.value = 'Charge un fichier CSV d abord.'
    return
  }
  if (!parsed.value) {
    status.value = 'CSV non valide.'
    return
  }
  isRunning.value = true
  status.value = 'Import en cours...'
  runImport({ target, rows: rows.value, meta: parsed.value })
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
      eyebrow="BackOffice"
      title="Import data"
      subtitle="Import des CSV produits, stock, commandes et images produits."
    />

    <div class="panel">
      <label class="field">
        <span>Fichier CSV</span>
        <input type="file" accept=".csv,text/csv" @change="onCsvSelected" />
      </label>
      <label class="field">
        <span>Images produits</span>
        <input type="file" accept="image/*" multiple @change="onImagesSelected" />
      </label>
      <div class="actions">
        <button class="secondary" :disabled="isRunning" @click="startImport('products')">
          Import produits (CSV)
        </button>
        <button class="secondary" :disabled="isRunning" @click="startImport('stocks')">
          Import stock (CSV)
        </button>
        <button class="secondary" :disabled="isRunning" @click="startImport('orders')">
          Import commandes (CSV)
        </button>
        <button class="secondary" :disabled="isRunning" @click="startImport('images')">
          Import images
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

.secondary {
  padding: 0.5rem 1.1rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
}

.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin: 0.8rem 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}
</style>