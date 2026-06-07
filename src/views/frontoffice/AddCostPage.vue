<template>
  <div class="page">
    <h1>Ajouter un cout</h1>

    <p v-if="message" :class="messageErreur ? 'erreur' : 'succes'">{{ message }}</p>

    <p v-if="chargementTickets">Chargement des tickets...</p>

    <form v-else @submit.prevent="ajouterCout">
      <div class="form-group">
        <label>Ticket *</label>
        <select v-model="ticketId" required>
          <option value="" disabled>-- Selectionner un ticket --</option>
          <option v-for="t in tickets" :key="t.id" :value="t.id">
            #{{ t.id }} — {{ t.name }}
          </option>
        </select>
      </div>

      <div class="ligne">
        <div class="form-group">
          <label>Duration_second *</label>
          <input v-model="durationSecond" type="number" min="0" step="1" required placeholder="ex: 600" />
        </div>

        <div class="form-group">
          <label>Time_Cost *</label>
          <input v-model="timeCost" type="number" min="0" step="0.01" required placeholder="ex: 8.7" />
        </div>

        <div class="form-group">
          <label>Fixed_Cost *</label>
          <input v-model="fixedCost" type="number" min="0" step="0.01" required placeholder="ex: 50" />
        </div>
      </div>

      <button type="submit" class="btn" :disabled="enCours">
        {{ enCours ? 'Envoi...' : 'Ajouter le cout' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAll } from '../../services/ticket.js'
import { create } from '../../services/ticketCost.js'

const tickets = ref([])
const chargementTickets = ref(true)

const ticketId = ref('')
const durationSecond = ref('')
const timeCost = ref('')
const fixedCost = ref('')

const enCours = ref(false)
const message = ref('')
const messageErreur = ref(false)

onMounted(async () => {
  try {
    tickets.value = await getAll()
  } catch (e) {
    message.value = 'Impossible de charger les tickets : ' + e.message
    messageErreur.value = true
  } finally {
    chargementTickets.value = false
  }
})

async function ajouterCout() {
  enCours.value = true
  message.value = ''
  messageErreur.value = false

  try {
    const body = {
      name: 'Cout ticket #' + ticketId.value,
      duration: Number(durationSecond.value),
      cost_time: Number(timeCost.value),
      cost_fixed: Number(fixedCost.value)
    }

    await create(ticketId.value, body)
    message.value = 'Cout ajoute avec succes pour le ticket #' + ticketId.value + '.'

    ticketId.value = ''
    durationSecond.value = ''
    timeCost.value = ''
    fixedCost.value = ''
  } catch (e) {
    message.value = 'Erreur lors de l\'ajout : ' + e.message
    messageErreur.value = true
  } finally {
    enCours.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.form-group label {
  margin-bottom: 0.4rem;
  font-weight: 600;
}

.form-group input,
.form-group select {
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.ligne {
  display: flex;
  gap: 1rem;
}

.ligne .form-group {
  flex: 1;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.succes {
  color: #027a48;
}

.erreur {
  color: #b42318;
}
</style>
