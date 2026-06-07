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
        <option v-for="def in typesParc" :key="def.itemtype" :value="def.itemtype">{{ def.itemtype }}</option>
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
// ============================================================================
// ElementsPage.vue
// ----------------------------------------------------------------------------
// Page "Liste des elements" (FrontOffice) : affiche dans un tableau tous les
// materiels du parc (ordinateurs, ecrans, ...) avec une zone de recherche et
// plusieurs menus deroulants pour filtrer (type, statut, lieu, fabricant).
// Tout le filtrage se fait COTE NAVIGATEUR (en JavaScript, sur les donnees
// deja chargees) : aucune nouvelle requete n'est envoyee a l'API quand on tape
// dans la recherche ou qu'on change un filtre, ce qui rend l'interface instantanee.
//
// Rappel : ref(valeur) cree une "boite" reactive lue/modifiee via ".value"
// dans le script (et automatiquement dans le <template> via v-model).
// computed(fn) recalcule sa valeur automatiquement des qu'une ref utilisee
// dedans change : ici, des que "elements" ou un des criteres de recherche
// change, la liste filtree et les menus deroulants se mettent a jour seuls.
// ============================================================================

import { ref, computed, onMounted } from 'vue'
import { getAllElements } from '../../services/elements.js'
import * as parcElement from '../../services/parcElement.js'

// Liste des types de materiels geres (pour remplir le menu "Tous les types").
const typesParc = parcElement.TYPES

// Tous les elements du parc, charges une seule fois au demarrage (cf onMounted).
const elements = ref([])
const enCours = ref(true)
const erreur = ref('')

// Criteres de recherche, relies aux champs du formulaire via v-model.
// Une chaine vide '' signifie "pas de filtre sur ce critere".
const texte = ref('')
const filtreType = ref('')
const filtreStatus = ref('')
const filtreLocation = ref('')
const filtreManufacturer = ref('')

// Construit la liste des valeurs DISTINCTES (sans doublon) d'un champ donne,
// pour remplir un menu deroulant. Par exemple valeursDistinctes('location')
// renvoie tous les lieux differents presents dans les elements, tries.
//
// "champ" est le NOM du champ a lire (une chaine, ex: 'location'), et
// "el[champ]" lit dynamiquement cette propriete sur chaque element (c'est
// equivalent a el.location, mais le nom du champ est decide au moment de
// l'appel : valeursDistinctes('status'), valeursDistinctes('location')...).
//
// Set = structure qui ne garde jamais de doublons (ajouter deux fois la
// meme valeur ne change rien). [...ensemble] transforme ce Set en tableau
// classique pour pouvoir le trier avec .sort().
function valeursDistinctes(champ) {
  const ensemble = new Set()
  for (const el of elements.value) {
    if (el[champ]) ensemble.add(el[champ])
  }
  return [...ensemble].sort()
}

// Ces 3 menus deroulants se reconstruisent automatiquement des que la liste
// "elements" change (au chargement initial, par exemple).
const statuts = computed(() => valeursDistinctes('status'))
const lieux = computed(() => valeursDistinctes('location'))
const fabricants = computed(() => valeursDistinctes('manufacturer'))

// Calcule la liste affichee dans le tableau : tous les elements qui
// correspondent EN MEME TEMPS au texte recherche ET a tous les filtres
// actifs ("recherche multi-critere"). Se recalcule automatiquement des
// qu'un des criteres ou la liste "elements" change.
const elementsFiltres = computed(() => {
  // .trim() retire les espaces au debut/fin, .toLowerCase() met en minuscules :
  // la recherche ignore donc la casse et les espaces superflus.
  const recherche = texte.value.trim().toLowerCase()

  // .filter(fn) renvoie un NOUVEAU tableau ne contenant que les elements
  // pour lesquels "fn" renvoie "vrai". Ici, "fn" verifie chaque critere les
  // uns apres les autres et sort tout de suite (return false) des qu'un
  // critere ne correspond pas : pas besoin de tester les suivants.
  return elements.value.filter((el) => {
    // Filtre texte : on cherche le texte saisi dans le nom, le numero
    // d'inventaire OU la personne associee, peu importe lequel correspond.
    if (recherche) {
      const cible = (el.name + ' ' + el.inventory + ' ' + el.contact).toLowerCase()
      if (!cible.includes(recherche)) return false
    }
    // Filtres par menu deroulant : si un filtre est actif (non vide) et que
    // l'element ne correspond pas exactement, on l'exclut.
    if (filtreType.value && el.type !== filtreType.value) return false
    if (filtreStatus.value && el.status !== filtreStatus.value) return false
    if (filtreLocation.value && el.location !== filtreLocation.value) return false
    if (filtreManufacturer.value && el.manufacturer !== filtreManufacturer.value) return false
    // L'element a passe tous les filtres actifs : on le garde.
    return true
  })
})

// Chargement de tous les elements au moment ou la page apparait a l'ecran.
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
