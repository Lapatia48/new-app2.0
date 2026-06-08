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
// ============================================================================
// AddCostPage.vue
// ----------------------------------------------------------------------------
// Page "Ajouter un cout" (FrontOffice) : un formulaire qui permet d'associer
// un cout (duree + cout temps + cout fixe) a un ticket existant. La page
// charge d'abord la liste des tickets (pour remplir le menu deroulant), puis
// envoie le formulaire via le service ticketCost.create().
//
// Rappel : ref(valeur) cree une "boite" reactive lue/modifiee via ".value"
// dans le script ; v-model sur un <input>/<select> relie automatiquement sa
// valeur a une ref (l'utilisateur tape -> la ref se met a jour, et inversement).
// onMounted(fn) execute fn une fois la page affichee : ideal pour charger les
// donnees initiales (ici, la liste des tickets).
// ============================================================================

import { ref, onMounted } from 'vue'
import { getAll } from '../../services/ticket.js'
import { create } from '../../services/ticketCost.js'

// Liste des tickets pour remplir le <select> du formulaire.
const tickets = ref([])
const chargementTickets = ref(true)

// Champs du formulaire, relies aux <input>/<select> via v-model. Ils sont
// initialises a une chaine vide '' (et non 0) pour que les champs <input>
// affichent un placeholder vide au depart plutot qu'un "0".
const ticketId = ref('')
const durationSecond = ref('')
const timeCost = ref('')
const fixedCost = ref('')

// Etats d'affichage : enCours desactive le bouton pendant l'envoi ; message
// + messageErreur pilotent le texte et la couleur (succes/erreur) affiches
// en haut de page (cf :class="messageErreur ? 'erreur' : 'succes'" dans le <template>).
const enCours = ref(false)
const message = ref('')
const messageErreur = ref(false)

// Chargement de la liste des tickets des l'affichage de la page (necessaire
// pour remplir le menu deroulant "Ticket *" du formulaire).
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

// Declenchee a la soumission du formulaire (@submit.prevent="ajouterCout" :
// ".prevent" empeche le rechargement de page par defaut d'un <form> HTML).
async function ajouterCout() {
  enCours.value = true
  message.value = ''
  messageErreur.value = false

  try {
    // Les <input type="number"> renvoient du TEXTE via v-model (ex: "600"),
    // pas un nombre : Number(...) convertit explicitement en valeur numerique
    // avant de l'envoyer a l'API GLPI (qui attend des nombres).
    const body = {
      name: 'Cout ticket #' + ticketId.value,
      // "actiontime" est le champ GLPI pour la duree (cf importData.js -> importerCouts).
      actiontime: Number(durationSecond.value),
      cost_time: Number(timeCost.value),
      cost_fixed: Number(fixedCost.value)
    }

    await create(ticketId.value, body)
    message.value = 'Cout ajoute avec succes pour le ticket #' + ticketId.value + '.'

    // On vide le formulaire pour permettre une nouvelle saisie immediate.
    ticketId.value = ''
    durationSecond.value = ''
    timeCost.value = ''
    fixedCost.value = ''
  } catch (e) {
    message.value = 'Erreur lors de l\'ajout : ' + e.message
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
