<template>
  <div class="page">
    <h1>Liste des elements</h1>

    <p v-if="erreur" class="erreur">{{ erreur }}</p>
    <p v-if="enCours">Chargement...</p>

    <!-- Recherche multi-criteres -->
    <div class="filtres" v-if="!enCours">
      <input v-model="texte" type="text" placeholder="Rechercher (nom, inventaire, personne)" />

      <select v-model="filtreType">
        <option value="">Tous les types</option>
        <option value="Computer">Computer</option>
        <option value="Monitor">Monitor</option>
      </select>

      <select v-model="filtreStatus">
        <option value="">Tous les statuts</option>
        <option v-for="s in statuts" :key="s" :value="s">{{ s }}</option>
      </select>

      <select v-model="filtreLocation">
        <option value="">Tous les lieux</option>
        <option v-for="l in lieux" :key="l" :value="l">{{ l }}</option>
      </select>

      <select v-model="filtreManufacturer">
        <option value="">Tous les fabricants</option>
        <option v-for="m in fabricants" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <p class="compteur" v-if="!enCours">{{ elementsFiltres.length }} element(s) trouve(s)</p>

    <!-- Tableau des elements -->
    <table v-if="!enCours" class="tableau">
      <thead>
        <tr>
          <th>Image</th>
          <th>Nom</th>
          <th>Type</th>
          <th>Statut</th>
          <th>Lieu</th>
          <th>Fabricant</th>
          <th>Modele</th>
          <th>Inventaire</th>
          <th>Personne</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="el in elementsFiltres" :key="el.type + '-' + el.id">
          <td>
            <img v-if="el.image" :src="el.image" :alt="el.name" class="miniature" />
            <span v-else class="muted">-</span>
          </td>
          <td>{{ el.name }}</td>
          <td>{{ el.type }}</td>
          <td>{{ el.status || '-' }}</td>
          <td>{{ el.location || '-' }}</td>
          <td>{{ el.manufacturer || '-' }}</td>
          <td>{{ el.model || '-' }}</td>
          <td>{{ el.inventory || '-' }}</td>
          <td>{{ el.contact || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAllElements } from '../../services/elements.js'

const elements = ref([])
const enCours = ref(true)
const erreur = ref('')

// Criteres de recherche
const texte = ref('')
const filtreType = ref('')
const filtreStatus = ref('')
const filtreLocation = ref('')
const filtreManufacturer = ref('')

// Construit la liste des valeurs distinctes pour remplir un menu deroulant.
function valeursDistinctes(champ) {
  const ensemble = new Set()
  for (const el of elements.value) {
    if (el[champ]) ensemble.add(el[champ])
  }
  return [...ensemble].sort()
}

const statuts = computed(() => valeursDistinctes('status'))
const lieux = computed(() => valeursDistinctes('location'))
const fabricants = computed(() => valeursDistinctes('manufacturer'))

// Applique tous les criteres en meme temps (recherche multi-critere).
const elementsFiltres = computed(() => {
  const recherche = texte.value.trim().toLowerCase()

  return elements.value.filter((el) => {
    // Filtre texte : nom, inventaire ou personne.
    if (recherche) {
      const cible = (el.name + ' ' + el.inventory + ' ' + el.contact).toLowerCase()
      if (!cible.includes(recherche)) return false
    }
    // Filtres par menu deroulant.
    if (filtreType.value && el.type !== filtreType.value) return false
    if (filtreStatus.value && el.status !== filtreStatus.value) return false
    if (filtreLocation.value && el.location !== filtreLocation.value) return false
    if (filtreManufacturer.value && el.manufacturer !== filtreManufacturer.value) return false
    return true
  })
})

onMounted(async () => {
  try {
    elements.value = await getAllElements()
  } catch (e) {
    erreur.value = e.message
  } finally {
    enCours.value = false
  }
})
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
}

.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.filtres input,
.filtres select {
  padding: 0.5rem 0.7rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.filtres input {
  flex: 1;
  min-width: 220px;
}

.compteur {
  color: #777;
  margin: 0 0 0.5rem;
}

.tableau {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.tableau th,
.tableau td {
  border: 1px solid #ddd;
  padding: 0.5rem 0.7rem;
  text-align: left;
  font-size: 0.9rem;
}

.tableau th {
  background: #f5f5f5;
}

.miniature {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.muted {
  color: #999;
}

.erreur {
  color: #b42318;
}
</style>
