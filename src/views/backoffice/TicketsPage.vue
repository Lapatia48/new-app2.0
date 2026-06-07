<template>
  <div class="page">
    <h1>Tickets</h1>

    <p v-if="erreur" class="erreur">{{ erreur }}</p>

    <div class="layout">
      <!-- Liste des tickets -->
      <div class="liste">
        <p v-if="enCours">Chargement...</p>
        <button
          v-for="t in tickets"
          :key="t.id"
          class="item"
          :class="{ actif: ticketSelectionne && ticketSelectionne.id === t.id }"
          @click="ouvrirFiche(t)"
        >
          <span class="item-titre">{{ t.name }}</span>
          <span class="item-meta">{{ nomType(t.type) }} - {{ nomStatut(t.status) }}</span>
        </button>
      </div>

      <!-- Fiche du ticket selectionne -->
      <div class="fiche" v-if="ticketSelectionne">
        <h2>{{ ticketSelectionne.name }}</h2>

        <dl>
          <dt>Numero</dt>
          <dd>#{{ ticketSelectionne.id }}</dd>

          <dt>Type</dt>
          <dd>{{ nomType(ticketSelectionne.type) }}</dd>

          <dt>Statut</dt>
          <dd>{{ nomStatut(ticketSelectionne.status) }}</dd>

          <dt>Priorite</dt>
          <dd>{{ nomPriorite(ticketSelectionne.priority) }}</dd>

          <dt>Date</dt>
          <dd>{{ ticketSelectionne.date || '-' }}</dd>

          <dt>Description</dt>
          <dd class="description">{{ ticketSelectionne.content || '-' }}</dd>
        </dl>

        <h3>Materiels rattaches</h3>
        <ul v-if="materiels.length" class="materiels">
          <li v-for="m in materiels" :key="m.itemtype + '-' + m.items_id">
            {{ nomMateriel(m) }} <small>({{ m.itemtype }})</small>
          </li>
        </ul>
        <p v-else class="muted">Aucun materiel rattache.</p>

        <h3>Couts</h3>
        <table v-if="couts.length" class="couts">
          <thead>
            <tr><th>Duree (s)</th><th>Cout temps</th><th>Cout fixe</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in couts" :key="c.id">
              <td>{{ c.actiontime }}</td>
              <td>{{ c.cost_time }}</td>
              <td>{{ c.cost_fixed }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Aucun cout pour ce ticket.</p>
      </div>

      <div class="fiche vide" v-else>
        <p class="muted">Selectionnez un ticket pour voir sa fiche.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as ticket from '../../services/ticket.js'
import * as ticketCost from '../../services/ticketCost.js'
import * as itemTicket from '../../services/itemTicket.js'
import { getAllElements } from '../../services/elements.js'

const tickets = ref([])
const ticketSelectionne = ref(null)
const couts = ref([])
const materiels = ref([])
const enCours = ref(true)
const erreur = ref('')

// Table { "Computer-5" : "PC-ADM-001" } pour afficher le nom des materiels.
const nomsMateriels = ref({})

// Petites fonctions d'affichage : code GLPI -> texte lisible.
function nomType(type) {
  return Number(type) === 2 ? 'Demande' : 'Incident'
}

function nomPriorite(priorite) {
  const noms = { 1: 'Tres basse', 2: 'Basse', 3: 'Moyenne', 4: 'Haute', 5: 'Tres haute' }
  return noms[priorite] || priorite
}

function nomStatut(statut) {
  const noms = { 1: 'Nouveau', 2: 'En cours', 3: 'Planifie', 4: 'En attente', 5: 'Resolu', 6: 'Clos' }
  return noms[statut] || statut
}

// Retrouve le nom du materiel a partir du lien Item_Ticket.
function nomMateriel(lien) {
  return nomsMateriels.value[lien.itemtype + '-' + lien.items_id] || ('#' + lien.items_id)
}

async function ouvrirFiche(t) {
  ticketSelectionne.value = t
  couts.value = []
  materiels.value = []
  try {
    couts.value = (await ticketCost.getAllForTicket(t.id)) || []
    materiels.value = (await itemTicket.getAllForTicket(t.id)) || []
  } catch (e) {
    erreur.value = e.message
  }
}

onMounted(async () => {
  try {
    tickets.value = await ticket.getAll()

    // On charge les materiels une fois pour pouvoir afficher leurs noms.
    const elements = await getAllElements()
    for (const el of elements) {
      nomsMateriels.value[el.type + '-' + el.id] = el.name
    }
  } catch (e) {
    erreur.value = e.message
  } finally {
    enCours.value = false
  }
})
</script>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
}

.liste {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.item {
  text-align: left;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.item.actif {
  border-color: #2563eb;
  background: #eff4ff;
}

.item-titre {
  font-weight: 600;
}

.item-meta {
  font-size: 0.8rem;
  color: #777;
}

.fiche {
  background: white;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 1.5rem;
}

.fiche.vide {
  display: grid;
  place-items: center;
}

dl {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 0.5rem 1rem;
}

dt {
  font-weight: 600;
  color: #555;
}

dd {
  margin: 0;
}

.description {
  white-space: pre-wrap;
}

.materiels {
  margin: 0 0 1rem;
  padding-left: 1.2rem;
}

.couts {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}

.couts th,
.couts td {
  border: 1px solid #ddd;
  padding: 0.4rem 0.6rem;
  text-align: left;
}

.muted {
  color: #999;
}

.erreur {
  color: #b42318;
}
</style>
