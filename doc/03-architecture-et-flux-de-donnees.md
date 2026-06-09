# 3. Architecture et flux de donnees

## 3.1 Vue d'ensemble : les 3 couches du projet

```
┌─────────────────────────────────────────────────────────────────┐
│  src/views/                                                      │
│  Les PAGES (.vue) : affichage + interactions utilisateur.       │
│  -> Elles appellent des fonctions des "services", jamais l'API  │
│     directement.                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ appelle des fonctions comme
                            │ ticket.getAll(), parcElement.create(...)
┌───────────────────────────▼─────────────────────────────────────┐
│  src/services/*.js                                               │
│  Le "metier" : une fonction par action GLPI                     │
│  (ticket.js, parcElement.js, reset.js, importData.js, ...)      │
│  -> Elles appellent get/post/put/del de api.js, jamais fetch    │
│     directement.                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ appelle get(), post(), put(), del()
┌───────────────────────────▼─────────────────────────────────────┐
│  src/services/api.js                                             │
│  Le client HTTP generique : ouvre la session GLPI (token),      │
│  ajoute les en-tetes, gere les erreurs et la reconnexion.       │
│  -> C'est le SEUL fichier qui utilise `fetch`.                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ requetes HTTP (proxy /glpi -> GLPI)
                     ┌──────▼──────┐
                     │  API GLPI   │
                     └─────────────┘
```

**Pourquoi ce decoupage ?** Si demain l'adresse de l'API change, ou si GLPI
modifie sa façon de s'authentifier, il suffit de modifier `api.js`. Si un
champ d'un ticket change de nom cote GLPI, il suffit de modifier
`ticket.js`. Les pages (`views/`), elles, n'ont pas besoin de changer : elles
ne connaissent que des fonctions metier comme `ticket.getAll()`.

> **Regle a respecter dans toute nouvelle page** : n'appelez jamais `fetch`
> directement depuis un fichier `.vue`. Si la fonction dont vous avez besoin
> n'existe pas encore dans `services/`, ajoutez-la la-bas (en suivant le
> modele des fonctions existantes), puis appelez-la depuis votre page.

## 3.2 Le routeur : quelle URL affiche quelle page ?

Le fichier [`src/router/index.js`](../src/router/index.js) est la "carte" du
site. Chaque entree associe une URL a un composant `.vue` et lui donne un
**nom** (utilise partout dans les `<RouterLink>` plutot que l'URL en dur) :

```js
{ path: 'dashboard', name: 'bo-dashboard', component: DashboardPage }
```
→ l'URL `/backoffice/home/dashboard` affiche `DashboardPage.vue`, et tout
lien `<RouterLink :to="{ name: 'bo-dashboard' }">` y mene.

Les routes sont regroupees par "Layout" (`BackOfficeLayout.vue` /
`FrontOfficeLayout.vue`) grace a `children` : le menu du layout reste
affiche en permanence, et seul le contenu de `<RouterView/>` change selon la
page enfant active. C'est pour ça que le menu n'a pas besoin d'etre repete
dans chaque page.

## 3.3 Flux type n°1 : afficher une liste chargee depuis l'API

C'est le flux le plus courant du projet (Dashboard, Tickets, Elements...).
Exemple avec `ElementsPage.vue` :

```
1. L'utilisateur ouvre la page "/frontOffice/elements"
2. Vue affiche le HTML avec les ref vides : elements = [], enCours = true
   -> le <template> affiche "Chargement..." (v-if="enCours")
3. onMounted() se declenche automatiquement
   -> appelle getAllElements() (services/elements.js)
      -> qui appelle get(...) (services/api.js)
         -> qui ouvre une session GLPI si besoin (initSession)
         -> puis envoie la requete HTTP et renvoie le JSON recu
4. La reponse arrive : elements.value = [...]
   -> enCours.value = false
   -> Vue met l'affichage a jour TOUT SEUL (reactivite des `ref`)
   -> le tableau apparait, "Chargement..." disparait
5. Si une erreur survient a une etape quelconque : erreur.value = e.message
   -> le <template> affiche le message d'erreur (v-if="erreur")
```

Vous retrouverez ce meme schema (refs `enCours`/`erreur`, `onMounted`,
`try/catch/finally`) dans `DashboardPage.vue`, `TicketsPage.vue`,
`ElementsPage.vue`, `AddCostPage.vue`, `NewTicketPage.vue`...

## 3.4 Flux type n°2 : envoyer un formulaire (creation)

Exemple avec `NewTicketPage.vue` (creation d'un ticket avec materiels
rattaches) :

```
1. L'utilisateur remplit le formulaire (les champs sont relies a des `ref`
   via v-model : titre, description, type, priorite, selection...)
2. Il clique sur "Creer le ticket" -> declenche creerTicket()
   (le formulaire utilise @submit.prevent pour empecher le rechargement
   de page par defaut d'un <form> HTML)
3. enCours.value = true (le bouton se desactive, affiche "Creation...")
4. Etape A : ticket.create(input) -> cree le ticket dans GLPI,
   renvoie l'objet cree (avec son id)
5. Etape B : pour chaque element coche, itemTicket.create(...) ->
   rattache ce materiel au ticket (table de liaison Item_Ticket)
   /!\ ces deux etapes sont SEPAREES car l'API GLPI ne permet pas
   de creer un ticket ET ses rattachements en une seule requete.
6. Succes -> message de confirmation + on vide le formulaire
   Erreur (a n'importe quelle etape) -> message d'erreur, rien n'est annule
   automatiquement (voir le piege correspondant dans le fichier 05)
7. finally : enCours.value = false (le bouton se reactive dans tous les cas)
```

Le meme schema general (formulaire -> validation -> appel(s) au service ->
message de succes/erreur -> reinitialisation) se retrouve dans
`AddCostPage.vue` et `login.vue` (en plus simple).

## 3.5 Flux type n°3 : les operations "globales" (Import / Reset)

Ces deux pages (`ImportPage.vue`, `ResetPage.vue`) ne font presque aucun
travail elles-memes : elles **delèguent tout** a un service "chef
d'orchestre" (`importData.js` / `reset.js`) et se contentent d'afficher sa
progression au fil de l'eau via une fonction `log`.

```
Page (ResetPage.vue)                     Service (reset.js)
─────────────────────                     ──────────────────
journal = ref([])
function log(message) {
  journal.value.push(message)   <─────┐
}                                      │ appelle log(...) a CHAQUE etape
                                       │ importante pour informer la page
await resetAll(log)  ─────────────────►│
                                       │  resetAll(log) {
                                       │    log('Debut...')
                                       │    ... supprime chaque ticket ...
                                       │    log('Ticket supprime : ...')
                                       │    ... supprime chaque materiel ...
                                       │    log('Termine')
                                       │  }
```

C'est le **pattern de "callback de progression"** : on transmet une fonction
(`log`) au service, qui l'appelle lui-meme a chaque etape. La page n'a donc
pas besoin de "deviner" l'avancement : le service la previent en direct.
Vous retrouverez exactement le meme principe dans `ImportPage.vue` /
`importData.js`.

> Le bouton "Lancer l'import" reste desactive tant que les 3 fichiers CSV ne
> sont pas choisis (calcul automatique via `computed` : `toutEstLa`). Le nom
> des fichiers n'a aucune importance : seul l'**ordre** dans lequel ils sont
> deposes determine leur role (1er = materiels, 2e = tickets, 3e = couts) —
> voir `services/importData.js` (`EXPECTED_HEADERS`) pour le detail.

## 3.6 Ou sont les "vraies" definitions des types de materiel ?

Plutot que de coder en dur la liste des types geres (Computer, Monitor...)
dans chaque page, le projet centralise cette liste dans
[`src/services/parc/index.js`](../src/services/parc/index.js), qui exporte
le tableau `ELEMENTS`. Trois pages l'utilisent directement :
`DashboardPage.vue`, `ElementsPage.vue`, `ResetPage.vue`.

Chaque type de materiel est **une classe JavaScript independante** dans son
propre fichier (`parc/computer.js`, `parc/cable.js`, `parc/monitor.js`...).
Toutes suivent le meme contrat :

```
class Computer {
  static itemtype = 'Computer'     // code GLPI (utilise dans les URLs)
  static label = 'Ordinateur'      // nom singulier affiche
  static labelPluriel = 'Ordinateurs'

  constructor(row) { ... }         // lit une ligne de CSV
  async toInput() { ... }          // construit le payload GLPI
  async create() { ... }           // POST + renvoie l'id

  static getAll(options) { ... }   // GET liste
  static getOne(id) { ... }        // GET un seul
  static remove(id) { ... }        // DELETE force_purge
  static toDisplay(brut) { ... }   // GLPI brut -> objet d'affichage uniforme
}
```

`toDisplay()` est important : il normalise les champs (tous les types
renvoient les memes cles `name`, `status`, `location`, `contact`, etc.)
pour que `ElementsPage.vue` n'ait pas besoin de savoir quel type il affiche.

Types actuellement geres (dans l'ordre d'affichage) :
`Computer`, `Monitor`, `NetworkEquipment`, `Peripheral`, `Printer`, `Phone`,
`Rack`, `Enclosure`, `PDU`, `PassiveDCEquipment`, `Software`, `CartridgeItem`,
`ConsumableItem`, `Cable`, `DeviceSimcard`.

**Pour ajouter un nouveau type** : creer son fichier (ex: `parc/scanner.js`)
puis l'ajouter dans le tableau `ELEMENTS` de `parc/index.js`. Aucune page
n'a besoin d'etre modifiee. Voir la recette dans le fichier 05.

## 3.7 Deuxieme backend : Spring Boot (dossier `eval/`)

En plus de GLPI, le projet utilise un **deuxieme serveur** (Java/Spring Boot)
pour stocker la **personnalisation du tableau Kanban** dans une base SQLite
locale :

```
src/services/kanbanConfig.js   -->  GET/POST http://localhost:8080/api/kanban-config
                                           (serveur Spring Boot, dossier eval/)
eval/src/main/java/com/eval/eval/
  bdd/ConnexionBdd.java          connexion SQLite (un seul endroit)
  entity/KanbanConfig.java       objet metier (id, couleurs, noms, langue)
  repository/KanbanConfigRepository.java  CRUD : getAll, getById, save, update, delete
  service/KanbanConfigService.java        logique metier
  controller/KanbanConfigController.java  routes /api/kanban-config
eval/src/main/resources/static/kanban-config.html   page de personnalisation
```

Ce second serveur suit l'architecture classique Spring Boot debutant :
`Controller -> Service -> Repository -> ConnexionBdd -> SQLite`.

Il est independant du reste du site : si il est eteint, le Kanban affiche
les couleurs et noms de statut par defaut (definis dans `kanbanConfig.js`).
La variable `.env` `VITE_KANBAN_CONFIG_BASE` pointe vers son adresse.
