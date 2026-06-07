# 5. Pieges generaux et recettes de modification

## 5.1 Pieges generaux a connaitre AVANT de modifier le code

### Piege n°1 : oublier `.value`
Dans le `<script>`, une `ref` se lit/modifie toujours via `.value`
(`compteur.value`). Dans le `<template>`, Vue l'enleve automatiquement
(`{{ compteur }}`). Melanger les deux est l'erreur la plus frequente d'un
debutant — heureusement, la console du navigateur (F12) affiche en general
un message d'erreur clair quand ça arrive.

### Piege n°2 : modifier une donnee sans passer par `.value`
```js
const tickets = ref([])

tickets = []          // ❌ ERREUR : on essaie de remplacer la "boite" elle-meme
tickets.value = []    // ✅ correct : on change ce qu'il y a DANS la boite
```

### Piege n°3 : `async`/`await` oublie
Toute fonction qui appelle un service (`ticket.getAll()`,
`parcElement.create(...)`, etc.) renvoie une Promise : il faut soit
`await` ce resultat (dans une fonction `async`), soit explicitement gerer la
Promise. Oublier `await` fait que votre variable contiendra une Promise "en
attente" plutot que la vraie donnee — un bug classique et deroutant.

```js
// ❌ incorrect : "tickets" contiendra une Promise, pas un tableau
async function charger() {
  tickets.value = ticket.getAll()
}

// ✅ correct
async function charger() {
  tickets.value = await ticket.getAll()
}
```

### Piege n°4 : appeler `fetch` directement depuis une page
Toujours passer par un service (voir [03-architecture-et-flux-de-donnees.md](./03-architecture-et-flux-de-donnees.md)).
Cela garde toute la logique d'authentification/erreur a un seul endroit
(`services/api.js`) et evite de la dupliquer partout.

### Piege n°5 : les codes numeriques de GLPI
GLPI represente type/statut/priorite par des **nombres**, pas du texte
(ex: `type === 2` signifie "Demande"). Le code traduit ces nombres en texte
lisible avec de petits "dictionnaires" (`{ 1: 'Nouveau', 2: 'En cours', ... }`)
visibles dans `TicketsPage.vue` (`nomType`, `nomStatut`, `nomPriorite`) et
`NewTicketPage.vue` (`TYPE_TICKET`, `PRIORITE`). Si vous ajoutez un nouveau
statut/type/priorite cote GLPI, pensez a mettre a jour CES dictionnaires —
sinon le code GLPI brut s'affichera tel quel a l'ecran.

### Piege n°6 : actions destructrices irreversibles
`ResetPage.vue` et `services/reset.js` suppriment des donnees
**definitivement** (`force_purge=true`, pas de corbeille). Ne retirez jamais
le `confirm(...)` de demande de confirmation, et reflechissez a deux fois
avant d'etendre ce comportement a d'autres pages.

---

## 5.2 Recette : ajouter un champ a un formulaire existant

Exemple : ajouter un champ "Numero de telephone" au formulaire de creation
de ticket (`NewTicketPage.vue`).

1. **Ajouter une `ref`** pour stocker la valeur du champ :
   ```js
   const telephone = ref('')
   ```
2. **Ajouter le champ dans le `<template>`**, relie via `v-model` :
   ```html
   <div class="form-group">
     <label>Telephone</label>
     <input v-model="telephone" type="text" />
   </div>
   ```
3. **L'inclure dans l'objet envoye a l'API** (verifiez d'abord, dans la
   documentation de l'API GLPI ou `apiv1.json`/`apiv2.3.json` a la racine du
   projet, le NOM EXACT du champ attendu cote GLPI) :
   ```js
   const input = {
     name: titre.value,
     content: description.value,
     // ... champs existants ...
     phone: telephone.value   // <- nom du champ cote GLPI, a verifier !
   }
   ```
4. **Reinitialiser le champ apres succes**, comme les autres :
   ```js
   telephone.value = ''
   ```

---

## 5.3 Recette : ajouter un nouveau type de materiel (ex: "Printer")

Grace au design centralise de `parcElements.json` (voir section 3.6),
**aucune page n'a besoin d'etre modifiee**. Il suffit d'ajouter une entree
dans [`src/services/parcElements.json`](../src/services/parcElements.json),
en suivant le modele des entrees existantes (regardez `Computer` ou
`Monitor` comme exemple : `itemtype`, `endpoint`, `label`, `labelPluriel`,
et les autres champs presents).

Une fois l'entree ajoutee :
- `DashboardPage.vue` affichera automatiquement son compteur
- `ElementsPage.vue` proposera automatiquement ce type dans son filtre
- `ResetPage.vue` le supprimera automatiquement lors d'une reinitialisation
- `services/importData.js` saura l'importer si un CSV contient ce type
  dans sa colonne `Item_Type` (relire `importerMateriels` pour le detail)

> Apres modification, **redemarrez `npm run dev`** : les fichiers `.json`
> importes sont parfois mis en cache par l'outil de build.

---

## 5.4 Recette : ajouter une nouvelle page

Exemple : ajouter une page "Statistiques" au BackOffice.

1. **Creer le fichier** `src/views/backoffice/StatsPage.vue`, en copiant la
   structure d'une page existante simple (par exemple `DashboardPage.vue`
   si elle doit charger des donnees, ou `BackOfficeHome.vue` si c'est une
   page "vitrine" sans donnees).

2. **Declarer la route** dans `src/router/index.js` :
   ```js
   import StatsPage from '../views/backoffice/StatsPage.vue'
   // ...
   children: [
     // ... routes existantes ...
     { path: 'stats', name: 'bo-stats', component: StatsPage }
   ]
   ```
   Le `path` determine l'URL (`/backoffice/home/stats`), le `name` est ce
   que vous utiliserez dans les `<RouterLink>` (jamais l'URL en dur).

3. **Ajouter le lien dans le menu**, dans `BackOfficeLayout.vue` :
   ```html
   <RouterLink :to="{ name: 'bo-stats' }">Statistiques</RouterLink>
   ```

4. Si la page doit charger des donnees : suivez le "Flux type n°1" decrit
   dans [03-architecture-et-flux-de-donnees.md](./03-architecture-et-flux-de-donnees.md)
   (refs `enCours`/`erreur`, `onMounted`, `try/catch/finally`).

---

## 5.5 Recette : ajouter une fonction a un service existant

Exemple : ajouter une fonction pour recuperer un seul element du parc par
son identifiant GLPI (au lieu de toute la liste).

Ouvrez le service concerne (ex: `services/elements.js` ou
`services/parcElement.js`) et **suivez le modele des fonctions deja
presentes** : elles delèguent toutes a `get`/`post`/`put`/`del` de
`services/api.js` et ne contiennent jamais de `fetch` direct. Exemple tire
de `services/ticket.js` :

```js
export function getOne(id) {
  return get(ENDPOINT + '/' + id)
}
```

Vous pouvez vous en inspirer directement pour une nouvelle fonction
similaire dans un autre service. La regle d'or : si une fonction ressemble a
une fonction deja existante, copiez sa structure plutot que d'en inventer
une nouvelle — la coherence du code facilite enormement sa relecture future.

---

## 5.6 Ou trouver le detail des champs/endpoints de l'API GLPI ?

Les fichiers `apiv1.json` et `apiv2.3.json` a la racine du projet contiennent
la documentation technique de l'API GLPI utilisee (generee par
`tools/gen-apiv1.mjs`, voir le script `gen:apiv1` dans `package.json`). En
cas de doute sur le nom exact d'un champ ou d'un endpoint, c'est la
reference a consulter en premier — avant de deviner ou de tester au hasard.
