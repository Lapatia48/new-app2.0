<template>
  <div class="page">
    <h1>Reinitialiser les donnees</h1>
    <p class="info">
      Ce bouton supprime DEFINITIVEMENT tous les tickets, tous les elements du
      parc (ordinateurs, ecrans, cables, cartes SIM...), les utilisateurs
      importes et les documents (images) presents dans GLPI.
      A utiliser avant un nouvel import.
    </p>

    <button class="btn-danger" :disabled="enCours" @click="lancerReset">
      {{ enCours ? 'Suppression en cours...' : 'Reinitialiser les donnees' }}
    </button>

    <!-- Journal : affiche chaque etape -->
    <pre v-if="journal.length" class="journal">{{ journal.join('\n') }}</pre>
  </div>
</template>

<script setup>
// ============================================================================
// ResetPage.vue
// ----------------------------------------------------------------------------
// Page "Reinitialiser les donnees" : un seul gros bouton qui supprime
// DEFINITIVEMENT tous les tickets et materiels de GLPI (utile avant de
// relancer un import propre). Le travail de suppression est fait par le
// service resetAll() ; cette page se contente de demander une confirmation,
// d'appeler le service et d'afficher sa progression dans un journal.
// ============================================================================

import { ref } from 'vue'
import { resetAll } from '../../services/reset.js'
import { ELEMENTS } from '../../services/parc/index.js'

// enCours : desactive le bouton et change son texte pendant la suppression.
// journal : liste des lignes affichees a l'ecran (alimentee par log() ci-dessous).
const enCours = ref(false)
const journal = ref([])

// Ajoute une ligne au journal affiche a l'ecran. Cette fonction est passee
// a resetAll(), qui l'appelle a chaque suppression pour montrer la progression.
function log(message) {
  journal.value.push(message)
}

// Declenchee par le clic sur le bouton (@click="lancerReset").
async function lancerReset() {
  // confirm(...) ouvre une popup native du navigateur avec OK/Annuler.
  // Si l'utilisateur clique sur Annuler, confirm() renvoie "false" et on
  // arrete tout de suite avec "return" : rien n'est supprime.
  if (!confirm('Confirmer la suppression definitive de toutes les donnees ?')) {
    return
  }
  enCours.value = true
  journal.value = []
  try {
    // resetAll renvoie un resume du type :
    //   { tickets: 5, materiels: { Computer: 3, Monitor: 2, ... } }
    const resume = await resetAll(log)

    // On construit une phrase recapitulative a partir de ce resume.
    // ELEMENTS est la liste des classes d'elements (avec leur "label" humain,
    // ex: 'Ordinateur'). Pour chaque type, on va chercher le nombre
    // correspondant dans resume.materiels et on fabrique un petit texte
    // comme "3 ordinateur(s)". .join(', ') colle tous ces textes avec une
    // virgule entre chaque, ex: "3 ordinateur(s), 2 ecran(s)".
    const detailMateriels = ELEMENTS
      .map((Element) => resume.materiels[Element.itemtype] + ' ' + Element.label.toLowerCase() + '(s)')
      .join(', ')
    log('Termine : ' + resume.tickets + ' ticket(s), ' + detailMateriels +
      ', ' + resume.utilisateurs + ' utilisateur(s), ' +
      resume.documents + ' document(s) supprime(s).')
  } catch (erreur) {
    log('ERREUR : ' + erreur.message)
  } finally {
    // Toujours execute (succes ou erreur) : on reactive le bouton.
    enCours.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.info {
  color: #555;
  margin-bottom: 1.5rem;
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: #b42318;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.journal {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: pre-wrap;
  max-height: 400px;
  overflow: auto;
}
</style>
