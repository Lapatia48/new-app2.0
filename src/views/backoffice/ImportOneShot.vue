<script setup>
import { ref } from 'vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { runImportOneShot } from '@/services/import/importServiceOneShot'
import { resetData } from '@/services/reset/resetService'

const selectedFiles = ref([])
const status = ref('')
const statusType = ref('')
const isRunning = ref(false)

function onFolderSelected(event) {
  const input = event.target
  selectedFiles.value = input && input.files ? Array.from(input.files) : []
  statusType.value = ''

  if (!selectedFiles.value.length) {
    status.value = ''
    return
  }

  const summary = summarizeFiles(selectedFiles.value)
  status.value = `Dossier charge: ${summary.csvCount} CSV, ${summary.imageCount} images.`
}

async function startImport() {
  if (!selectedFiles.value.length) {
    statusType.value = 'error'
    status.value = 'Selectionne un dossier avec produit.csv, stock.csv, commande.csv et images/.'
    return
  }

  isRunning.value = true
  statusType.value = ''
  status.value = 'Import one-shot en cours...'

  try {
    const summary = await runImportOneShot({ files: selectedFiles.value })
    status.value = formatSummary(summary)
  } catch (error) {
    statusType.value = 'error'
    status.value = getErrorMessage(error)
    try {
      await resetData()
    } catch (resetError) {
      console.log('Rollback resetData failed', resetError)
    }
  } finally {
    isRunning.value = false
  }
}

function summarizeFiles(files) {
  let csvCount = 0
  let imageCount = 0

  for (const file of files) {
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) {
      csvCount += 1
    }
    if (name.endsWith('.png')) {
      imageCount += 1
    }
  }

  return { csvCount, imageCount }
}

function formatSummary(summary) {
  const { products, stocks, orders, images } = summary
  return [
    `Import termine:`,
    `produits ${products.success}/${products.total}`,
    `stock ${stocks.success}/${stocks.total}`,
    `commandes ${orders.success}/${orders.total}`,
    `images ${images.success}/${images.total}.`
  ].join(' ')
}

function getErrorMessage(error) {
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }
  return 'Erreur pendant l import.'
}
</script>

<template>
  <div class="stack">
    <SectionHeader
      eyebrow="BackOffice"
      title="Import OneShot"
      subtitle="Import du dossier complet (CSV + images)."
    />

    <div class="panel">
      <label class="field">
        <span>Dossier import</span>
        <input type="file" webkitdirectory directory @change="onFolderSelected" />
      </label>
      <div class="actions">
        <button class="secondary" :disabled="isRunning" @click="startImport">
          {{ isRunning ? 'Import en cours...' : 'Lancer import one-shot' }}
        </button>
      </div>
      <p v-if="status" :class="['status', statusType]">{{ status }}</p>
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

.status.error {
  color: #dc2626;
}
</style>
