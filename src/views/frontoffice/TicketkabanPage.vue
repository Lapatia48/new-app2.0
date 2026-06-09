<template>
    <p>{{ tickets.length }}</p>
    <div v-for="(tickets, statut) in ticketsParStatut" :key="statut" @dragover="onDragOver($event)"
        @drop="onDrop($event, statut)">
        <h2>{{ statut }}</h2>
        <p>{{ tickets.length }}</p>
        <br>
        <p>Ticket associé</p>
        <button v-for="t of tickets" :key="tickets.id" @click="showDetails(t)" draggable="true"
            @dragstart="onDragStart($event, t)">
            <p>{{ t.name }}</p>
            <p>{{ t.id }}</p>
        </button>

        <br>

        <button v-if="statut == 'Nouveau'" @click="createNewTicket()">Nouveau ticket</button>
    </div>

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
                <tr>
                    <th>Duree (s)</th>
                    <th>Cout temps</th>
                    <th>Cout fixe</th>
                </tr>
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

</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import * as ticket from '../../services/ticket.js'
import { useRouter } from 'vue-router'
import * as ticketCost from '../../services/ticketCost.js'
import * as itemTicket from '../../services/itemTicket.js'
import * as itilFollowUp from '../../services/itilFollowUp.js'

const router = useRouter()
const tickets = ref([])
const ticketSelectionne = ref(null)

const erreur = ref(null)

const couts = ref([])
const materiels = ref([])

const nomsMateriels = ref({})



const STATUT_TICKET = { 1: 'Nouveau', 2: 'In Progress', 3: 'Prévue', 4: 'En attente', 5: 'Terminé', 6: 'Fermé' }

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

function numStatut(nomStatut) {
    const statuts = { New: 1, Nouveau: 1, Processing: 2, Assigned: 2, 'In Progress': 2, Planned: 3, Pending: 4, 'En attente': 4, Resolved: 5, 'Terminé': 5, 'Résolu': 5, Solved: 5, Closed: 6, 'Fermé': 6 }
    return statuts[nomStatut] || nomStatut
}

function nomMateriel(lien) {
    return nomsMateriels.value[lien.itemtype + '-' + lien.items_id] || ('#' + lien.items_id)
}

const ticketsParStatut = computed(() => {
    const result = {};
    for (const ticket of tickets.value) {
        const statutId = ticket.status;
        if (statutId == 1 || statutId == 2 || statutId == 5) {
            const statut = STATUT_TICKET[statutId]
            if (!result[statut]) {
                result[statut] = [];
            }
            result[statut].push(ticket);
        }
    }
    return result;
});

const createNewTicket = () => {
    router.push({ name: 'fo-new-ticket' })
}

async function showDetails(t) {
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

function onDragStart(event, ticket) {
    event.dataTransfer.setData('text/plain', JSON.stringify({ id: ticket.id }))
    event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
}

async function onDrop(event, nouveauStatutNom) {
    event.preventDefault()
    const confirmed = confirm(`Êtes-vous sûr de vouloir changer le statut à "${nouveauStatutNom}" ?`)
    if (!confirmed) return

    const rawData = event.dataTransfer.getData('text/plain')
    if (!rawData) return
    const { id } = JSON.parse(rawData)

    const reponse = prompt('Ajouter une réponse au ticket (optionnel) :')

    if (reponse && reponse.trim()) {
        const followupData = {
            itemtype: 'Ticket',
            items_id: id,
            content: reponse,
            is_private: 0
        }
        try {
            await itilFollowUp.create(followupData)
            alert('Réponse ajoutée avec succès')
        } catch (err) {
            console.error('Erreur lors de l\'ajout de la réponse', err)
        }
    }
    try {

        await ticket.update(id, { status: numStatut(nouveauStatutNom) })
        tickets.value = await ticket.getAll()
    } catch (err) {
        console.error('Erreur mise à jour statut', err)
    }
}

onMounted(async () => {
    try {
        tickets.value = await ticket.getAll()
    } catch (e) {
        erreur.value = e.message
    }
})
</script>