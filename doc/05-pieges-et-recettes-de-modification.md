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

## 5.3 Recette : ajouter un nouveau type de materiel (ex: "Scanner")

Chaque type de materiel est une **classe JavaScript dans son propre fichier**
(dossier `src/services/parc/`). Voici les 2 etapes a suivre.

**Etape 1** : creer `src/services/parc/scanner.js` en copiant le fichier
d'un type proche (ex: `computer.js` pour un type complet, `cable.js` pour
un type sans location ni fabricant). Modifier :

```js
export default class Scanner {
  static itemtype = 'Scanner'          // code GLPI exact (verifier dans l'API)
  static endpoint = '/Scanner'
  static label = 'Scanner'
  static labelPluriel = 'Scanners'

  constructor(row) {
    this.name = row.Name
    // ... autres colonnes CSV utilisees par ce type
  }

  async toInput() {
    return {
      name: this.name,
      // ... champs GLPI exacts de ce type (verifier dans apiv1.json)
    }
  }

  async create() {
    const cree = await post(Scanner.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) { ... }
  static getOne(id) { ... }
  static remove(id) { ... }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: Scanner.itemtype,
      name: nettoyer(brut.name),
      status: ..., location: ..., manufacturer: ...,
      model: ..., inventory: ..., contact: ...
      // TOUJOURS les memes cles : ElementsPage.vue s'attend a ce format
    }
  }
}
```

**Etape 2** : dans [`src/services/parc/index.js`](../src/services/parc/index.js),
ajouter l'import et l'entree dans le tableau `ELEMENTS` :

```js
import Scanner from './scanner.js'

export const ELEMENTS = [
  Computer, Monitor, ..., Scanner  // <-- ajouter ici
]
```

Une fois ces 2 etapes faites, automatiquement :
- `DashboardPage.vue` affiche son compteur
- `ElementsPage.vue` propose ce type dans le filtre
- `ResetPage.vue` le supprime lors d'une reinitialisation
- `ImportPage.vue` sait l'importer si le CSV a `Item_Type = Scanner`

> Apres modification, **redemarrez `npm run dev`** si le changement ne
> se reflете pas immediatement.

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

Ouvrez le service concerne (ex: `services/elements.js` ou la classe dans
`services/parc/`) et **suivez le modele des fonctions deja presentes** :
elles deleguent toutes a `get`/`post`/`put`/`del` de `services/api.js` et
ne contiennent jamais de `fetch` direct. Exemple tire de `services/ticket.js` :

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

## 5.6 Images et documents (upload / affichage)

Les images des materiels sont stockees dans GLPI comme des **Documents**
(`services/document.js`) et telechargees au moment de l'affichage.

**Pendant l'import** : si l'archive `.zip` contient un fichier dont le nom
correspond exactement au nom du materiel dans le CSV, `uploadAndLink()` l'envoie
a GLPI via un `POST` multipart (`/Document`) puis cree le lien (`/Document_Item`).

**Lors de l'affichage** (`ElementsPage.vue`) : `getAllElements()` charge d'abord
tous les materiels, puis en parallele recupere l'URL blob de la premiere image
rattachee a chacun. Si aucune image n'est trouvee, l'image de repli locale
(dossier `public/images/`, meme nom que le materiel) est utilisee.

**Lors du reset** : les documents ne sont PAS supprimes automatiquement avec le
materiel dans GLPI. `resetAll()` les supprime donc explicitement via
`document.getAll()` + `document.remove(id)`.

> ⚠️ Un document GLPI lie a un materiel ne peut pas etre lu sans droits API
> suffisants sur `/Document`. Si les images ne s'affichent pas, verifier les
> droits du compte API (`VITE_GLPI_USERNAME`) dans GLPI (Profil > Droits).

---

## 5.7 Ou trouver le detail des champs/endpoints de l'API GLPI ?

Les fichiers `apiv1.json` et `apiv2.3.json` a la racine du projet contiennent
la documentation technique de l'API GLPI utilisee (generee par
`tools/gen-apiv1.mjs`, voir le script `gen:apiv1` dans `package.json`). En
cas de doute sur le nom exact d'un champ ou d'un endpoint, c'est la
reference a consulter en premier — avant de deviner ou de tester au hasard.
