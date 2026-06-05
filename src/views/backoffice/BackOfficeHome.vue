<template>
    <div class="backoffice-home">
        <section class="hero-card">
            <p class="eyebrow">BackOffice</p>
            <h1>Bienvenue sur le BackOffice</h1>
            <p>
                Vous êtes connecté avec les identifiants configurés dans le fichier .env.
            </p>
            <div class="actions">
                <button class="primary" :disabled="isBusy" @click="handleImport">
                    Import data
                </button>
                <button class="neutral" :disabled="isBusy" @click="handleTest">
                    Tester API GLPI
                </button>
                <button class="danger" :disabled="isBusy" @click="handleReset">
                    Reset data
                </button>
            </div>
            <ImportFilePicker :disabled="isBusy" @files-changed="handleFilesChanged" />
            <div class="status">
                <span class="badge" :class="tokenBadgeClass">
                    {{ tokenLabel }}
                </span>
                <span v-if="currentAction" class="status-text">{{ currentAction }}</span>
            </div>
            <div class="log" v-if="logs.length">
                <p class="log-title">Journal</p>
                <ul>
                    <li v-for="entry in logs" :key="entry.id" :class="entry.level">
                        {{ entry.message }}
                    </li>
                </ul>
            </div>
        </section>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ImportFilePicker from '@/components/ImportFilePicker.vue'
import {
    ensureAccessToken,
    hasAccessToken,
    importDataFromFiles,
    resetData,
    testGlpiApis
} from '@/services/glpi'

const logs = ref([])
const isImporting = ref(false)
const isResetting = ref(false)
const isTesting = ref(false)
const fileSelection = ref({
    csvFiles: {},
    imageFiles: {},
    missingCsv: [],
    hasAllCsv: false
})

const isBusy = computed(() => isImporting.value || isResetting.value || isTesting.value)
const tokenLabel = computed(() => (hasAccessToken() ? 'Token OK' : 'Token manquant'))
const tokenBadgeClass = computed(() => (hasAccessToken() ? 'ok' : 'warn'))
const currentAction = computed(() => {
    if (isImporting.value) {
        return 'Import en cours...'
    }

    if (isResetting.value) {
        return 'Reset en cours...'
    }

    if (isTesting.value) {
        return 'Test API en cours...'
    }

    return ''
})

function pushLog(message, level = 'info') {
    logs.value.unshift({
        id: `${Date.now()}-${Math.random()}`,
        level,
        message
    })
}

function handleProgress(entry) {
    if (!entry?.message) {
        return
    }

    pushLog(entry.message, entry.type || entry.level || 'info')
}

function handleFilesChanged(selection) {
    fileSelection.value = selection
}

async function handleImport() {
    if (isBusy.value) {
        return
    }

    logs.value = []
    isImporting.value = true
    pushLog('Import demarre', 'info')

    try {
        if (!fileSelection.value?.hasAllCsv) {
            const missing = fileSelection.value?.missingCsv || []
            pushLog(`CSV manquants: ${missing.join(', ')}`, 'error')
            return
        }

        await importDataFromFiles({
            files: fileSelection.value,
            onProgress: handleProgress
        })
        pushLog('Import termine', 'success')
    } catch (error) {
        pushLog(`Erreur import: ${error.message || error}`, 'error')
    } finally {
        isImporting.value = false
    }
}

async function handleReset() {
    if (isBusy.value) {
        return
    }

    const confirmed = window.confirm('Confirmer la suppression des donnees GLPI ?')
    if (!confirmed) {
        return
    }

    logs.value = []
    isResetting.value = true
    pushLog('Reset demarre', 'info')

    try {
        await resetData({ onProgress: handleProgress })
        pushLog('Reset termine', 'success')
    } catch (error) {
        pushLog(`Erreur reset: ${error.message || error}`, 'error')
    } finally {
        isResetting.value = false
    }
}

async function handleTest() {
    if (isBusy.value) {
        return
    }

    logs.value = []
    isTesting.value = true
    pushLog('Test API demarre', 'info')

    try {
        await testGlpiApis({ onProgress: handleProgress })
        pushLog('Test API termine', 'success')
    } catch (error) {
        pushLog(`Erreur test: ${error.message || error}`, 'error')
    } finally {
        isTesting.value = false
    }
}

onMounted(async () => {
    try {
        await ensureAccessToken()
    } catch (error) {
        pushLog(`Token: ${error.message || error}`, 'error')
    }
})
</script>

<style scoped>
.backoffice-home {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem;
}

.hero-card {
    width: min(100%, 640px);
    padding: 3rem;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.3);
    color: #0f172a;
    display: grid;
    gap: 1.5rem;
}

.eyebrow {
    margin: 0 0 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.8rem;
    font-weight: 700;
}

h1 {
    margin: 0 0 1rem;
    font-size: clamp(2rem, 4vw, 3.5rem);
    line-height: 1.05;
}

p {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.6;
    color: #334155;
}

.actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.actions button {
    border: none;
    border-radius: 999px;
    padding: 0.85rem 1.6rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.actions button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    box-shadow: none;
}

.actions button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.15);
}

.actions .primary {
    background: #1d4ed8;
    color: #fff;
}

.actions .danger {
    background: #dc2626;
    color: #fff;
}

.actions .neutral {
    background: #0f172a;
    color: #fff;
}

.status {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.status-text {
    font-size: 0.95rem;
    color: #475569;
}

.badge {
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    background: #e2e8f0;
    color: #0f172a;
}

.badge.ok {
    background: #dcfce7;
    color: #166534;
}

.badge.warn {
    background: #fef9c3;
    color: #854d0e;
}

.log {
    background: #f8fafc;
    border-radius: 16px;
    padding: 1rem 1.25rem;
    border: 1px solid #e2e8f0;
}

.log-title {
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: #0f172a;
}

.log ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
    max-height: 220px;
    overflow: auto;
}

.log li {
    font-size: 0.9rem;
    color: #1e293b;
}

.log li.success {
    color: #15803d;
}

.log li.error {
    color: #b91c1c;
}
</style>