<template>
  <div class="page">
    <h1>Creer un ticket</h1>

    <p v-if="message" :class="messageErreur ? 'erreur' : 'succes'">{{ message }}</p>

    <form @submit.prevent="creerTicket">
      <div class="form-group">
        <label>Titre *</label>
        <input v-model="titre" type="text" required />
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea v-model="description" rows="4"></textarea>
      </div>

      <div class="ligne">
        <div class="form-group">
          <label>Type</label>
          <select v-model="type">
            <option value="Incident">Incident</option>
            <option value="Request">Demande</option>
          </select>
        </div>

        <div class="form-group">
          <label>Priorite</label>
          <select v-model="priorite">
            <option value="Very Low">Tres basse</option>
            <option value="Low">Basse</option>
            <option value="Medium">Moyenne</option>
            <option value="High">Haute</option>
            <option value="Very High">Tres haute</option>
          </select>
        </div>
      </div>

      <!-- Association de plusieurs elements -->
      <div class="form-group">
        <label>Elements associes ({{ selection.length }} selectionne(s))</label>
        <input v-model="recherche" type="text" placeholder="Filtrer les elements" class="filtre-elements" />

        <div class="liste-elements">
          <p v-if="chargementElements">Chargement des elements...</p>
          <label v-for="el in elementsFiltres" :key="el.type + '-' + el.id" class="case">
            <input type="checkbox" :value="el" v-model="selection" />
            <span>{{ el.name }} <small>({{ el.type }})</small></span>
          </label>
        </div>
      </div>

      <button type="submit" class="btn" :disabled="enCours">
        {{ enCours ? 'Creation...' : 'Creer le ticket' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAllElements } from '../../services/elements.js'
import * as ticket from '../../services/ticket.js'
import * as itemTicket from '../../services/itemTicket.js'

// Tables de correspondance texte -> code GLPI.
const TYPE_TICKET = { Incident: 1, Request: 2 }
const PRIORITE = { 'Very Low': 1, Low: 2, Medium: 3, High: 4, 'Very High': 5 }

// Champs du formulaire
const titre = ref('')
const description = ref('')
const type = ref('Incident')
const priorite = ref('Medium')
const selection = ref([]) // elements coches (objets { id, type, name, ... })

// Liste des elements a cocher
const elements = ref([])
const chargementElements = ref(true)
const recherche = ref('')

const enCours = ref(false)
const message = ref('')
const messageErreur = ref(false)

const elementsFiltres = computed(() => {
  const r = recherche.value.trim().toLowerCase()
  if (!r) return elements.value
  return elements.value.filter((el) => el.name.toLowerCase().includes(r))
})

onMounted(async () => {
  try {
    elements.value = await getAllElements()
  } catch (e) {
    message.value = 'Impossible de charger les elements : ' + e.message
    messageErreur.value = true
  } finally {
    chargementElements.value = false
  }
})

async function creerTicket() {
  enCours.value = true
  message.value = ''
  messageErreur.value = false

  try {
    const prio = PRIORITE[priorite.value]

    // 1. On cree le ticket.
    const input = {
      name: titre.value,
      content: description.value,
      type: TYPE_TICKET[type.value],
      urgency: prio,
      impact: prio,
      priority: prio
    }
    const cree = await ticket.create(input)

    // 2. On rattache REELLEMENT chaque element coche au ticket (Item_Ticket).
    for (const el of selection.value) {
      await itemTicket.create(cree.id, el.type, el.id)
    }

    message.value =
      'Ticket cree avec succes (numero ' + cree.id + '), ' +
      selection.value.length + ' element(s) rattache(s).'

    // On vide le formulaire.
    titre.value = ''
    description.value = ''
    type.value = 'Incident'
    priorite.value = 'Medium'
    selection.value = []
    recherche.value = ''
  } catch (e) {
    message.value = 'Erreur lors de la creation : ' + e.message
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
.form-group textarea,
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

.filtre-elements {
  margin-bottom: 0.5rem;
}

.liste-elements {
  border: 1px solid #ddd;
  border-radius: 6px;
  max-height: 220px;
  overflow: auto;
  padding: 0.5rem;
  background: white;
}

.case {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.2rem;
  font-weight: normal;
}

.case small {
  color: #777;
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
