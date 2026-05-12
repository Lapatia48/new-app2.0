<script setup>
import { ref } from 'vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { resetData } from '@/services/reset/resetService'

const isRunning = ref(false)
const status = ref('')

async function startReset() {
  isRunning.value = true
  status.value = 'Reset en cours...'
  resetData()
    .then((summary) => {
      status.value = `Reset termine: ${summary.totalActions} actions, ${summary.failedActions} erreurs.`
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


    <div class="panel">
      <div class="actions">
        <button class="danger" :disabled="isRunning" @click="startReset">
          {{ isRunning ? 'Reset en cours...' : 'Reset donnees' }}
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

.actions {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.danger {
  padding: 0.5rem 1.1rem;
  border-radius: 6px;
  border: none;
  background: #dc2626;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin: 0.8rem 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}
</style>