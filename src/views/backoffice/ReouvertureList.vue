<script setup>
import { ref, onMounted } from 'vue'
import * as supercostService from '../../services/supercost.js'

const reouvertures = ref([])
const supercosts = ref([])
const chargement = ref(true)
const erreur = ref(null)

const modalReouvertureVisible = ref(false)
const reouvertureEnModification = ref(null)
const formReouverture = ref({
  pourcentage: 0,
  mode: 1
})

const modalSupercostVisible = ref(false)
const supercostEnModification = ref(null)
const formSupercost = ref({
  montant: 0
})

function format(n) {
  if (n === undefined || n === null) return '0.00'
  return (Math.round(n * 100) / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('fr-FR')
}

function getModeLabel(mode) {
  const labels = {
    1: 'Dernier coût',
    2: 'Premier coût',
    3: 'Moyenne',
    4: 'Somme'
  }
  return labels[mode] || 'Inconnu'
}

async function chargerDonnees() {
  try {
    chargement.value = true
    // const [reouvertureData, supercostData] = await Promise.all([
    //   supercostService.getAllReouverture(),
    //   supercostService.getAll()
    // ])
    reouvertures.value = await supercostService.getAllReouverture()
    supercosts.value = await supercostService.getAll()
    erreur.value = null
  } catch (e) {
    erreur.value = e.message
    console.error('Erreur chargement:', e)
  } finally {
    chargement.value = false
  }
}

function ouvrirModalModificationReouverture(item) {
  reouvertureEnModification.value = item
  formReouverture.value = {
    pourcentage: item.pourcentageApplique || 0,
    mode: item.modeUtilise || 1
  }
  modalReouvertureVisible.value = true
}

function fermerModalReouverture() {
  modalReouvertureVisible.value = false
  reouvertureEnModification.value = null
}

async function modifierReouvertureAction() {
  if (!reouvertureEnModification.value) return
  
  try {
    await supercostService.modifierReouverture(
      reouvertureEnModification.value.id,
      formReouverture.value.pourcentage,
      formReouverture.value.mode
    )
    await chargerDonnees()
    fermerModalReouverture()
    alert('Réouverture modifiée avec succès !')
  } catch (e) {
    erreur.value = e.message
    alert('Erreur: ' + e.message)
  }
}

function ouvrirModalModificationSupercost(sc) {
  supercostEnModification.value = sc
  formSupercost.value = {
    montant: sc.supercost || 0
  }
  modalSupercostVisible.value = true
}

function fermerModalSupercost() {
  modalSupercostVisible.value = false
  supercostEnModification.value = null
}

async function modifierSupercostAction() {
  if (!supercostEnModification.value) return
  
  try {
    await supercostService.modifierSupercost(
      supercostEnModification.value.ticketsId,
      formSupercost.value.montant
    )
    await chargerDonnees()
    fermerModalSupercost()
    alert('SuperCost modifié avec succès !')
  } catch (e) {
    erreur.value = e.message
    alert('Erreur: ' + e.message)
  }
}

onMounted(() => {
  chargerDonnees()
})
</script>

<template>
  <div class="page">
    <h1>Gestion des Réouvertures et SuperCosts</h1>

    <p v-if="erreur" class="erreur">{{ erreur }}</p>
    <p v-if="chargement">Chargement en cours...</p>

    <div class="section">
      <h2>Liste des Réouvertures</h2>
      <table v-if="reouvertures.length" class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ticket ID</th>
            <th>Montant</th>
            <th>Mode utilisé</th>
            <th>Pourcentage appliqué</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in reouvertures" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.ticketsId }}</td>
            <td>{{ format(item.montant) }}</td>
            <td>
              <span class="badge">{{ getModeLabel(item.modeUtilise) }}</span>
            </td>
            <td>{{ item.pourcentageApplique }}%</td>
            <td>{{ formatDate(item.dateOperation) }}</td>
            <td>
              <button @click="ouvrirModalModificationReouverture(item)" class="btn-modifier">
                Modifier
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Aucune réouverture trouvée.</p>
    </div>

    <div class="section">
      <h2>Liste des SuperCosts</h2>
      <table v-if="supercosts.length" class="table">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>SuperCost</th>
            <th>Dernier coût</th>
            <th>Frais réouverture</th>
            <th>Nb réouvertures</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sc in supercosts" :key="sc.ticketsId">
            <td>{{ sc.ticketsId }}</td>
            <td>
              <span class="montant">{{ format(sc.supercost) }}</span>
            </td>
            <td>{{ format(sc.lastClose) }}</td>
            <td>{{ format(sc.fraisReouverture) }}</td>
            <td>{{ sc.nombreReouvertures || 0 }}</td>
            <td>
              <button @click="ouvrirModalModificationSupercost(sc)" class="btn-modifier">
                Modifier
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Aucun supercost trouvé.</p>
    </div>

    <div v-if="modalReouvertureVisible" class="modal-overlay" @click.self="fermerModalReouverture">
      <div class="modal">
        <h3>Modifier la réouverture #{{ reouvertureEnModification?.id }}</h3>
        <div class="form-group">
          <label>Pourcentage :</label>
          <input 
            v-model.number="formReouverture.pourcentage" 
            type="number" 
            min="0" 
            max="100"
            required
          >
        </div>
        <div class="form-group">
          <label>Mode :</label>
          <select v-model.number="formReouverture.mode">
            <option :value="1">1 - Dernier coût</option>
            <option :value="2">2 - Premier coût</option>
            <option :value="3">3 - Moyenne</option>
            <option :value="4">4 - Somme</option>
          </select>
        </div>
        <div class="modal-actions">
          <button @click="modifierReouvertureAction" class="btn-save">Enregistrer</button>
          <button @click="fermerModalReouverture" class="btn-annuler">Annuler</button>
        </div>
      </div>
    </div>

    <div v-if="modalSupercostVisible" class="modal-overlay" @click.self="fermerModalSupercost">
      <div class="modal">
        <h3>Modifier le SuperCost du ticket #{{ supercostEnModification?.ticketsId }}</h3>
        <div class="form-group">
          <label>Nouveau montant :</label>
          <input 
            v-model.number="formSupercost.montant" 
            type="number" 
            min="0"
            step="0.01"
            required
          >
        </div>
        <div class="form-group">
          <p><strong>Ancien montant :</strong> {{ format(supercostEnModification?.supercost) }}</p>
        </div>
        <div class="modal-actions">
          <button @click="modifierSupercostAction" class="btn-save">Enregistrer</button>
          <button @click="fermerModalSupercost" class="btn-annuler">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>



