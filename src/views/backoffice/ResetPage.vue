<template>
  <div class="page">
    <h1>Reinitialiser les donnees</h1>
    <p class="info">
      Ce bouton supprime DEFINITIVEMENT tous les tickets, ordinateurs et ecrans
      presents dans GLPI. A utiliser avant un nouvel import.
    </p>

    <button class="btn-danger" :disabled="enCours" @click="lancerReset">
      {{ enCours ? 'Suppression en cours...' : 'Reinitialiser les donnees' }}
    </button>

    <!-- Journal : affiche chaque etape -->
    <pre v-if="journal.length" class="journal">{{ journal.join('\n') }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { resetAll } from '../../services/reset.js'
import * as parcElement from '../../services/parcElement.js'

const enCours = ref(false)
const journal = ref([])

// Ajoute une ligne au journal affiche a l'ecran.
function log(message) {
  journal.value.push(message)
}

async function lancerReset() {
  if (!confirm('Confirmer la suppression definitive de toutes les donnees ?')) {
    return
  }
  enCours.value = true
  journal.value = []
  try {
    const resume = await resetAll(log)
    const detailMateriels = parcElement.TYPES
      .map((def) => resume.materiels[def.itemtype] + ' ' + def.label.toLowerCase() + '(s)')
      .join(', ')
    log('Termine : ' + resume.tickets + ' ticket(s), ' + detailMateriels + ' supprime(s).')
  } catch (erreur) {
    log('ERREUR : ' + erreur.message)
  } finally {
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
