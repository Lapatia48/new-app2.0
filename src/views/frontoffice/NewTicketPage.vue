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
// ============================================================================
// NewTicketPage.vue
// ----------------------------------------------------------------------------
// Page "Creer un ticket" (FrontOffice) : formulaire pour creer un ticket
// d'assistance GLPI (titre, description, type, priorite) et y rattacher
// plusieurs materiels via des cases a cocher (avec une recherche pour
// filtrer la longue liste). La creation se fait en DEUX etapes successives :
//   1) creer le ticket (ticket.create)
//   2) rattacher chaque materiel coche au ticket cree (itemTicket.create)
// car l'API GLPI ne permet pas de faire les deux en une seule requete.
//
// Rappel : ref(valeur) cree une "boite" reactive lue/modifiee via ".value"
// dans le script ; v-model relie automatiquement un champ de formulaire a
// une ref. computed(fn) recalcule sa valeur des qu'une ref utilisee dedans
// change. onMounted(fn) s'execute une fois la page affichee (chargement initial).
// ============================================================================

import { ref, computed, onMounted } from 'vue'
import { getAllElements } from '../../services/elements.js'
import * as ticket from '../../services/ticket.js'
import * as itemTicket from '../../services/itemTicket.js'

// Tables de correspondance texte affiche -> code numerique attendu par GLPI.
// Ce sont des objets utilises comme "dictionnaires" : TYPE_TICKET['Incident']
// vaut 1, PRIORITE['High'] vaut 4, etc. Cela evite d'ecrire les nombres
// magiques un peu partout dans le code (plus facile a relire et a maintenir).
const TYPE_TICKET = { Incident: 1, Request: 2 }
const PRIORITE = { 'Very Low': 1, Low: 2, Medium: 3, High: 4, 'Very High': 5 }

// --- Champs du formulaire, relies aux <input>/<select> via v-model ---
const titre = ref('')
const description = ref('')
const type = ref('Incident')
const priorite = ref('Medium')
// "selection" contient les OBJETS elements coches (pas juste leurs id) :
// v-model="selection" sur des <input type="checkbox" :value="el"> remplit
// automatiquement ce tableau avec chaque "el" coche. On a besoin de l'objet
// complet (id + type) pour pouvoir rattacher le materiel au ticket plus tard.
const selection = ref([]) // elements coches (objets { id, type, name, ... })

// --- Liste des elements proposes a la selection (cases a cocher) ---
const elements = ref([])
const chargementElements = ref(true)
const recherche = ref('') // texte tape pour filtrer la liste de cases a cocher

// Etats d'affichage du formulaire (bouton desactive pendant l'envoi, message
// de succes/erreur affiche en haut de page).
const enCours = ref(false)
const message = ref('')
const messageErreur = ref(false)

// Liste des elements a cocher APRES filtrage par la recherche. Si la zone
// de recherche est vide, on affiche tous les elements ; sinon, uniquement
// ceux dont le nom contient le texte tape (recherche insensible a la casse
// grace a .toLowerCase() des deux cotes de la comparaison).
const elementsFiltres = computed(() => {
  const r = recherche.value.trim().toLowerCase()
  if (!r) return elements.value
  return elements.value.filter((el) => el.name.toLowerCase().includes(r))
})

// Chargement de la liste des elements des l'affichage de la page (necessaire
// pour proposer les cases a cocher "Elements associes").
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

// Declenchee a la soumission du formulaire (@submit.prevent="creerTicket" :
// ".prevent" empeche le rechargement de page par defaut d'un <form> HTML).
async function creerTicket() {
  enCours.value = true
  message.value = ''
  messageErreur.value = false

  try {
    // La priorite choisie ('Medium', 'High', ...) est convertie UNE FOIS en
    // code numerique, puis reutilisee pour 3 champs differents : dans GLPI,
    // urgency/impact/priority partagent la meme echelle de valeurs (1 a 5).
    const prio = PRIORITE[priorite.value]

    // 1. On cree d'abord le ticket lui-meme (sans les materiels : l'API ne
    //    permet pas de les associer directement a la creation).
    const input = {
      name: titre.value,
      content: description.value,
      type: TYPE_TICKET[type.value],
      urgency: prio,
      impact: prio,
      priority: prio
    }
    const cree = await ticket.create(input)

    // 2. On rattache REELLEMENT chaque element coche au ticket fraichement
    //    cree, un par un, via la table de liaison Item_Ticket (sans cette
    //    etape, le ticket existerait mais n'aurait aucun materiel rattache).
    for (const el of selection.value) {
      await itemTicket.create(cree.id, el.type, el.id)
    }

    message.value =
      'Ticket cree avec succes (numero ' + cree.id + '), ' +
      selection.value.length + ' element(s) rattache(s).'

    // On reinitialise tous les champs pour permettre la creation d'un
    // nouveau ticket immediatement, sans recharger la page.
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
    // Toujours execute (succes ou erreur) : on reactive le bouton.
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
