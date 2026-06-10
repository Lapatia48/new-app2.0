# Documentation du projet — pour reprendre le code sans IA

Ce dossier explique le fonctionnement du site **sans presupposer d'experience
en JavaScript ou en Vue**. Il est ecrit pour qu'un developpeur junior puisse
comprendre, modifier et faire evoluer le projet seul.

Lisez les fichiers dans l'ordre : chacun s'appuie sur le precedent.

1. [01-demarrage-rapide.md](./01-demarrage-rapide.md)
   Comment installer et lancer le projet en local, et a quoi servent les
   variables du fichier `.env`.

2. [02-notions-essentielles-js-vue.md](./02-notions-essentielles-js-vue.md)
   Le "vocabulaire" minimal de JavaScript et Vue utilise PARTOUT dans le
   code (`ref`, `computed`, `onMounted`, `v-model`, `async/await`, etc.),
   avec des exemples tres simples. **A lire avant d'ouvrir un fichier `.vue`.**

3. [03-architecture-et-flux-de-donnees.md](./03-architecture-et-flux-de-donnees.md)
   Comment le projet est range (dossiers `views`, `services`, `router`) et
   comment une page va chercher ses donnees dans GLPI : le "voyage" d'une
   information depuis l'API jusqu'a l'ecran.

4. [04-pages-en-detail.md](./04-pages-en-detail.md)
   Le role de chaque page (fichier `.vue` dans `src/views`), ce qu'elle
   affiche, ce qu'elle appelle, et les pieges propres a chacune.

5. [05-pieges-et-recettes-de-modification.md](./05-pieges-et-recettes-de-modification.md)
   Les erreurs classiques a eviter, et des "recettes" pas-a-pas pour les
   modifications les plus frequentes (ajouter un champ, ajouter un type de
   materiel, ajouter une page, etc.).

## Repere rapide : ou se trouve quoi ?

```
src/
├── main.js                    point d'entree de l'application Vue
├── App.vue                    composant racine (affiche juste <RouterView/>)
├── router/index.js            la "carte" du site : quelle URL affiche quelle page
├── services/
│   ├── api.js                 le seul fichier qui fait des fetch (toutes les requetes GLPI passent par lui)
│   ├── ticket.js              actions sur les tickets GLPI
│   ├── user.js                find-or-create des utilisateurs + suppression reset
│   ├── document.js            upload + lecture + suppression d'images (Documents GLPI)
│   ├── reset.js               suppression complete (tickets + parc + users + documents)
│   ├── importData.js          chef d'orchestre de l'import CSV + zip
│   ├── kanbanConfig.js        personnalisation du Kanban (couleurs/langue, via Spring Boot)
│   ├── parc/
│   │   ├── index.js           catalogue des types : tableau ELEMENTS + elementParType()
│   │   ├── computer.js        classe Computer (ordinateur)
│   │   ├── monitor.js         classe Monitor (ecran)
│   │   ├── cable.js           classe Cable
│   │   ├── deviceSimcard.js   classe DeviceSimcard (carte SIM)
│   │   └── ...                un fichier par type de materiel
│   └── elements.js            fusionne tous les types en une seule liste pour le frontoffice
└── views/
    ├── backoffice/            pages reservees a l'administration (apres connexion)
    │   ├── login.vue          connexion (mot de passe dans .env)
    │   ├── DashboardPage.vue  compteurs materiels + tickets
    │   ├── ImportPage.vue     import CSV + zip images
    │   ├── ResetPage.vue      reinitialisation complete
    │   └── TicketsPage.vue    liste des tickets avec fiche detail
    └── frontoffice/           pages ouvertes aux utilisateurs finaux
        ├── ElementsPage.vue   tableau du parc avec images + filtres
        ├── NewTicketPage.vue  creation de ticket
        └── TicketkabanPage.vue  tableau Kanban (glisser-deposer + personnalisation Spring Boot)

eval/                          backend Spring Boot (personnalisation Kanban)
├── src/main/java/com/eval/eval/
│   ├── bdd/ConnexionBdd.java         connexion SQLite
│   ├── entity/KanbanConfig.java      objet metier
│   ├── repository/KanbanConfigRepository.java  CRUD SQLite
│   ├── service/KanbanConfigService.java         logique metier
│   └── controller/KanbanConfigController.java   routes /api/kanban-config
└── src/main/resources/static/kanban-config.html  page de personnalisation
```

Une regle simple a retenir pour tout le projet :

> **Les fichiers `views/**.vue` s'occupent de l'AFFICHAGE.**
> **Les fichiers `services/*.js` s'occupent de PARLER A L'API GLPI.**

Une page (`.vue`) ne fait jamais de `fetch` directement : elle appelle une
fonction d'un service (ex: `ticket.getAll()`), qui elle-meme appelle les
fonctions generiques `get`/`post`/`put`/`del` de `services/api.js`. Voir le
schema complet dans [03-architecture-et-flux-de-donnees.md](./03-architecture-et-flux-de-donnees.md).

**Exception** : `kanbanConfig.js` ne passe PAS par `api.js` — il parle
directement au backend Spring Boot (`eval/`) via un `fetch` vers
`http://localhost:8080`. C'est voulu : c'est un serveur completement
independant de GLPI.
