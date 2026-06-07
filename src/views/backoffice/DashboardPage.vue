<template>
  <div class="page">
    <h1>Tableau de bord</h1>

    <p v-if="enCours">Chargement...</p>
    <p v-if="erreur" class="erreur">{{ erreur }}</p>

    <div v-if="!enCours && !erreur" class="grilles">
      <!-- Bloc materiels -->
      <section class="bloc">
        <h2>Materiels</h2>
        <p class="grand-nombre">{{ totalMateriels }}</p>
        <p class="sous-titre">elements au total</p>
        <ul class="detail">
          <li v-for="def in typesParc" :key="def.itemtype">
            <span>{{ def.labelPluriel }}</span><strong>{{ materiels[def.itemtype].length }}</strong>
          </li>
        </ul>
      </section>

      <!-- Bloc tickets -->
      <section class="bloc">
        <h2>Tickets</h2>
        <p class="grand-nombre">{{ tickets.length }}</p>
        <p class="sous-titre">tickets au total</p>
        <ul class="detail">
          <li v-for="(nombre, type) in ticketsParType" :key="type">
            <span>{{ type }}</span><strong>{{ nombre }}</strong>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
// ============================================================================
// DashboardPage.vue
// ----------------------------------------------------------------------------
// Page "Tableau de bord" : affiche des compteurs (nombre de materiels par
// type, nombre de tickets par type) calcules a partir des donnees recuperees
// depuis l'API GLPI au chargement de la page.
//
// Concepts Vue utilises ici (si vous debutez en JS/Vue, lisez ceci d'abord) :
//
// - ref(valeur)      : cree une "boite" reactive qui contient une valeur.
//                      On lit/modifie son contenu via ".value" DANS LE SCRIPT
//                      (ex: enCours.value = true). Dans le <template>, Vue
//                      enleve automatiquement le ".value" (ex: {{ enCours }}).
//                      "Reactive" = quand la valeur change, l'affichage se
//                      met a jour tout seul, sans recharger la page.
//
// - computed(fn)     : calcule une valeur DERIVEE d'autres refs. Vue retient
//                      le resultat et ne refait le calcul que si une des
//                      valeurs utilisees dedans change (un peu comme une
//                      formule de tableur qui se recalcule automatiquement).
//
// - onMounted(fn)    : execute la fonction une fois que la page est affichee
//                      a l'ecran. C'est l'endroit classique pour aller
//                      chercher les donnees depuis l'API au chargement.
// ============================================================================

import { ref, computed, onMounted } from 'vue'
import * as parcElement from '../../services/parcElement.js'
import * as ticket from '../../services/ticket.js'

// La liste des types d'elements du parc vient de parcElements.json : ajouter
// un nouveau type (Printer, ...) ne demande aucune modification ici.
// Exemple de contenu d'un "def" : { itemtype: 'Computer', label: 'Ordinateur', labelPluriel: 'Ordinateurs' }
const typesParc = parcElement.TYPES

// "materiels" est un OBJET (pas un tableau) qui ressemble a :
//   { Computer: [], Monitor: [], ... }
// Chaque cle est un "itemtype" (le nom technique GLPI du type de materiel,
// ex: 'Computer'), et sa valeur est un TABLEAU ("liste") d'elements de ce
// type, rempli plus bas dans onMounted(). Au depart, chaque liste est vide.
//
// Object.fromEntries([...]) construit un objet a partir d'une liste de
// paires [cle, valeur]. Ici on transforme typesParc (un tableau de "def")
// en paires [itemtype, []] grace a .map(...).
const materiels = ref(Object.fromEntries(typesParc.map((def) => [def.itemtype, []])))

// Tableau des tickets recuperes depuis l'API (rempli dans onMounted).
const tickets = ref([])

// Indicateurs d'etat affiches dans le <template> (spinner / message d'erreur).
const enCours = ref(true)
const erreur = ref('')

// Nombre TOTAL de materiels, tous types confondus.
//
// "materiels.value" est l'objet { Computer: [...], Monitor: [...], ... }.
// Object.values(objet) renvoie UNIQUEMENT les valeurs de cet objet, sous
// forme de tableau : ici un tableau de tableaux, ex. [ [...], [...], ... ]
// (donc "liste" ci-dessous designe bien un de ces tableaux de materiels,
// PAS l'objet "materiels" lui-meme).
//
// .reduce(fn, valeurDeDepart) parcourt ce tableau et accumule un resultat :
// a chaque tour, "somme" est le total accumule jusque-la et "liste" est le
// tableau du type de materiel courant. On ajoute la taille de cette liste
// (liste.length = nombre d'elements de ce type) a la somme. On part de 0.
//
// Exemple concret avec materiels.value = { Computer: [a, b], Monitor: [c] } :
//   Object.values(...)        -> [ [a, b], [c] ]
//   reduce part de 0
//     tour 1 : somme = 0 + [a, b].length = 0 + 2 = 2
//     tour 2 : somme = 2 + [c].length     = 2 + 1 = 3
//   resultat final : 3
const totalMateriels = computed(() =>
  Object.values(materiels.value).reduce((somme, liste) => somme + liste.length, 0)
)

// Compte les tickets par type (1 = Incident, 2 = Demande), pour obtenir par
// exemple { Incident: 12, Demande: 5 }.
const ticketsParType = computed(() => {
  const compteur = {}
  for (const t of tickets.value) {
    // Dans GLPI, le champ "type" du ticket est un code numerique :
    // 2 = Demande, tout le reste (en pratique 1) = Incident.
    const nom = t.type === 2 ? 'Demande' : 'Incident'
    // (compteur[nom] || 0) : si la cle n'existe pas encore, on part de 0.
    compteur[nom] = (compteur[nom] || 0) + 1
  }
  return compteur
})

// Chargement des donnees au moment ou la page apparait a l'ecran.
onMounted(async () => {
  try {
    // Chaque type est compte independamment : un type non listable dans ce
    // GLPI (0 droit, itemtype absent...) reste a 0 sans casser le tableau.
    // (le try/catch est a l'INTERIEUR de la boucle : si un type echoue,
    // on continue quand meme avec les types suivants)
    for (const def of typesParc) {
      try {
        materiels.value[def.itemtype] = await parcElement.getAll(def.itemtype)
      } catch (e) {
        materiels.value[def.itemtype] = []
      }
    }
    tickets.value = await ticket.getAll()
  } catch (e) {
    // Erreur "globale" (ex: probleme de connexion a l'API) : on l'affiche.
    erreur.value = e.message
  } finally {
    // "finally" s'execute toujours, meme en cas d'erreur : on arrete le
    // spinner de chargement dans tous les cas.
    enCours.value = false
  }
})
</script>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.grilles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.bloc {
  background: white;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 1.5rem;
}

.grand-nombre {
  font-size: 3rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
  color: #2563eb;
}

.sous-titre {
  margin: 0 0 1rem;
  color: #777;
}

.detail {
  list-style: none;
  padding: 0;
  margin: 0;
}

.detail li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-top: 1px solid #eee;
}

.erreur {
  color: #b42318;
}
</style>
