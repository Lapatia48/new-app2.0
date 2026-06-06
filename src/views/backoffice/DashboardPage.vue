<template>
  <div class="page">
    <h1>Tableau de bord</h1>

    <p v-if="enCours">Chargement...</p>
    <p v-if="erreur" class="erreur">{{ erreur }}</p>

    <div v-if="!enCours && !erreur" class="grilles">
      <!-- Bloc materiels -->
      <section class="bloc">
        <h2>Materiels</h2>
        <p class="grand-nombre">{{ totalMateriels }}</p>
        <p class="sous-titre">elements au total</p>
        <ul class="detail">
          <li><span>Ordinateurs</span><strong>{{ nbComputers }}</strong></li>
          <li><span>Ecrans</span><strong>{{ nbMonitors }}</strong></li>
        </ul>
      </section>

      <!-- Bloc tickets -->
      <section class="bloc">
        <h2>Tickets</h2>
        <p class="grand-nombre">{{ tickets.length }}</p>
        <p class="sous-titre">tickets au total</p>
        <ul class="detail">
          <li v-for="(nombre, type) in ticketsParType" :key="type">
            <span>{{ type }}</span><strong>{{ nombre }}</strong>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as computer from '../../services/computer.js'
import * as monitor from '../../services/monitor.js'
import * as ticket from '../../services/ticket.js'

const computers = ref([])
const monitors = ref([])
const tickets = ref([])
const enCours = ref(true)
const erreur = ref('')

const nbComputers = computed(() => computers.value.length)
const nbMonitors = computed(() => monitors.value.length)
const totalMateriels = computed(() => nbComputers.value + nbMonitors.value)

// Compte les tickets par type (1 = Incident, 2 = Demande).
const ticketsParType = computed(() => {
  const compteur = {}
  for (const t of tickets.value) {
    const nom = t.type === 2 ? 'Demande' : 'Incident'
    compteur[nom] = (compteur[nom] || 0) + 1
  }
  return compteur
})

onMounted(async () => {
  try {
    computers.value = await computer.getAll()
    monitors.value = await monitor.getAll()
    tickets.value = await ticket.getAll()
  } catch (e) {
    erreur.value = e.message
  } finally {
    enCours.value = false
  }
})
</script>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.grilles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.bloc {
  background: white;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 1.5rem;
}

.grand-nombre {
  font-size: 3rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
  color: #2563eb;
}

.sous-titre {
  margin: 0 0 1rem;
  color: #777;
}

.detail {
  list-style: none;
  padding: 0;
  margin: 0;
}

.detail li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-top: 1px solid #eee;
}

.erreur {
  color: #b42318;
}
</style>
