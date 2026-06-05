<template>
    <div class="import-picker">
        <p class="section-title">Fichiers a importer</p>
        <div class="picker-row">
            <label class="file-button">
                Parcourir dossier data
                <input
                    type="file"
                    webkitdirectory
                    directory
                    :disabled="disabled"
                    @change="handleFolderPick"
                />
            </label>
            <label class="file-button">
                Choisir CSV
                <input
                    type="file"
                    accept=".csv"
                    multiple
                    :disabled="disabled"
                    @change="handleCsvPick"
                />
            </label>
            <label class="file-button">
                Choisir images
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    :disabled="disabled"
                    @change="handleImagePick"
                />
            </label>
            <button class="ghost" type="button" :disabled="disabled" @click="clearSelection">
                Vider
            </button>
        </div>
        <div class="summary">
            <div
                v-for="csvName in expectedCsv"
                :key="csvName"
                class="summary-item"
                :class="csvStatusClass(csvName)"
            >
                {{ csvName }}
            </div>
            <div class="summary-item info">
                Images: {{ imageCount }}
            </div>
        </div>
        <p v-if="missingCsv.length" class="hint">
            CSV manquants: {{ missingCsv.join(', ') }}
        </p>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
    disabled: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['files-changed'])

const expectedCsv = ['feuille1.csv', 'feuille2.csv', 'feuille3.csv']
const csvFiles = ref({})
const imageFiles = ref({})

const missingCsv = computed(() =>
    expectedCsv.filter((name) => !csvFiles.value[name])
)

const imageCount = computed(() => Object.keys(imageFiles.value).length)

function emitSelection() {
    emit('files-changed', {
        csvFiles: csvFiles.value,
        imageFiles: imageFiles.value,
        missingCsv: missingCsv.value,
        hasAllCsv: missingCsv.value.length === 0
    })
}

function addFiles(files) {
    const nextCsv = { ...csvFiles.value }
    const nextImages = { ...imageFiles.value }

    Array.from(files || []).forEach((file) => {
        if (!file?.name) {
            return
        }

        if (file.name.toLowerCase().endsWith('.csv')) {
            nextCsv[file.name] = file
            return
        }

        if (file.type && file.type.startsWith('image/')) {
            nextImages[file.name] = file
        }
    })

    csvFiles.value = nextCsv
    imageFiles.value = nextImages
    emitSelection()
}

function handleFolderPick(event) {
    addFiles(event.target.files)
    event.target.value = ''
}

function handleCsvPick(event) {
    addFiles(event.target.files)
    event.target.value = ''
}

function handleImagePick(event) {
    addFiles(event.target.files)
    event.target.value = ''
}

function clearSelection() {
    csvFiles.value = {}
    imageFiles.value = {}
    emitSelection()
}

function csvStatusClass(name) {
    return csvFiles.value[name] ? 'ok' : 'warn'
}
</script>

<style scoped>
.import-picker {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 16px;
    border: 1px dashed #cbd5f5;
    background: #f8fafc;
}

.section-title {
    margin: 0;
    font-weight: 700;
    color: #0f172a;
}

.picker-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.file-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    background: #e2e8f0;
    color: #0f172a;
    font-weight: 600;
    cursor: pointer;
}

.file-button input {
    display: none;
}

.ghost {
    border: none;
    background: transparent;
    color: #1d4ed8;
    font-weight: 700;
    cursor: pointer;
}

.summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.summary-item {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
}

.summary-item.ok {
    background: #dcfce7;
    color: #166534;
}

.summary-item.warn {
    background: #fee2e2;
    color: #b91c1c;
}

.summary-item.info {
    background: #e2e8f0;
    color: #1e293b;
}

.hint {
    margin: 0;
    color: #b45309;
    font-size: 0.9rem;
}
</style>
