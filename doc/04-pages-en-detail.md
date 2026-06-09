# 4. Les pages en detail

Pour chaque page : son role, les services qu'elle appelle, et les points
auxquels faire attention si vous la modifiez. Les fichiers sont commentes
directement dans leur bloc `<script setup>` — ce document donne une vue
d'ensemble et les pieges qui depassent le cadre d'un simple commentaire de
ligne.

---

## BackOffice (`src/views/backoffice/`)

Espace reserve a l'administration. Acces protege par `login.vue` (voir plus
bas — attention, ce n'est PAS une vraie securite).

### `login.vue`
Formulaire de connexion. Compare ce que l'utilisateur tape avec
`VITE_BACKOFFICE_LOGIN` / `VITE_BACKOFFICE_PASSWORD` (definis dans `.env`).

> ⚠️ **Ce n'est pas une authentification securisee.** Les variables `.env`
> prefixees `VITE_` sont integrees dans le code envoye au navigateur : un
> utilisateur un peu curieux peut les lire. Ne JAMAIS y mettre un mot de
> passe sensible. Si une vraie securite est necessaire un jour, il faudra
> une authentification cote serveur (GLPI lui-meme, ou un petit serveur
> intermediaire).

### `BackOfficeLayout.vue`
Le cadre commun (menu + `<RouterView/>`). Aucune logique : si vous ajoutez
une page au BackOffice, ajoutez son lien ici ET une route dans
`router/index.js` (voir recette dans le fichier 05).

### `BackOfficeHome.vue`
Page d'accueil : juste des liens vers les autres pages. Aucune donnee
chargee.

### `DashboardPage.vue`
Affiche des compteurs (materiels par type, tickets par type) calcules avec
`computed` a partir des donnees chargees dans `onMounted`.

> ⚠️ **Piege** : la boucle de chargement essaie chaque type de materiel
> **independamment**, avec un `try/catch` A L'INTERIEUR de la boucle :
> ```js
> for (const def of typesParc) {
>   try {
>     materiels.value[def.itemtype] = await parcElement.getAll(def.itemtype)
>   } catch (e) {
>     materiels.value[def.itemtype] = []
>   }
> }
> ```
> C'est volontaire : si un type n'est pas autorise dans cette instance GLPI
> (droits insuffisants, itemtype absent...), il affiche simplement `0` au
> lieu de faire planter TOUTE la page. Si vous deplacez ce `try/catch` en
> dehors de la boucle, un seul type en erreur cassera tout l'affichage.

### `TicketsPage.vue`
Page "maitre-detail" : liste de tickets a gauche, fiche detaillee a droite.
Cliquer sur un ticket recharge SES couts et SES materiels rattaches
(`ouvrirFiche`), sans recharger toute la liste.

> ⚠️ **Piege** : `nomsMateriels` (table `{ "Computer-5": "PC-ADM-001" }`)
> est construite **une seule fois** dans `onMounted`, en chargeant TOUS les
> elements du parc. C'est volontaire (eviter de redemander les noms a
> chaque clic), mais cela signifie aussi que si un materiel est renomme
> APRES le chargement de la page, son nouveau nom n'apparaitra qu'apres
> rechargement complet de la page.

### `ImportPage.vue`
Selection de **3 fichiers CSV** (ordre fixe : materiels, tickets, couts) +
une **archive `.zip` d'images optionnelle**, puis appel a `runImport()`.

L'import se deroule en 3 etapes sequentielles :

1. **Materiels** (1er CSV) — colonnes attendues :
   `Name, Status, Location, Manufacturer, Item_Type, Model, Inventory_Number, User`
   - `Item_Type` determine la classe utilisee (`Computer`, `Cable`, `DeviceSimcard`...).
   - `User` est le nom du proprietaire : `User.resolveByName()` le cherche dans GLPI
     et le cree s'il n'existe pas encore (avec la marque `import-fako` dans le
     champ `comment`, ce qui permet au reset de le retrouver sans toucher les
     comptes systeme glpi/tech/normal).
   - Si le `.zip` contient une image dont le nom correspond exactement a `Name`,
     elle est uploadee dans GLPI et rattachee au materiel (`services/document.js`).

2. **Tickets** (2e CSV) — colonnes : `Ref_Ticket, Date, Heure, Type, Titre, Description, Status, Priority, Items`
   - Import en **3 phases** : (A) creer le ticket en statut "New", (B) rattacher
     les materiels de la colonne `Items` (JSON, ex: `["PC-ADM-001","MN-01"]`),
     (C) passer au statut final si different de "New". Cette sequence est
     obligatoire car GLPI refuse certains rattachements apres changement de statut.

3. **Couts** (3e CSV) — colonnes : `Num_Ticket, Duration_second, Time_Cost, Fixed_Cost`

> ⚠️ **Piege n°1** : le nom des fichiers n'a AUCUNE importance, seul l'ORDRE de
> selection compte. Les en-tetes sont verifiees (`EXPECTED_HEADERS` dans
> `services/importData.js`). Si un utilisateur inverse 2 fichiers, l'import
> echouera avec "Colonnes incorrectes" — c'est le comportement attendu.
>
> ⚠️ **Piege n°2** : en cas d'erreur, `runImport` relance automatiquement un
> `resetAll` pour nettoyer les donnees partiellement importees. La page affiche
> "Import annule. Verifiez les fichiers puis recommencez." — le vrai message
> d'erreur est dans le journal **au-dessus** de cette ligne.

### `ResetPage.vue`
Un bouton qui supprime DEFINITIVEMENT **tickets + materiels + utilisateurs
importes + documents (images)** (pour repartir sur une base propre avant un
nouvel import). Demande une confirmation avant de lancer.

Le reset supprime dans l'ordre : tickets, puis chaque type de materiel, puis
les **utilisateurs marques `import-fako`** (ceux crees par l'import — les
comptes systeme glpi/tech/normal sont epargnes car ils n'ont pas cette marque),
puis les **documents** (les images uploadees dans GLPI ne sont PAS supprimees
automatiquement avec le materiel : il faut les supprimer explicitement).

> ⚠️ **Action irreversible.** `resetAll` utilise `force_purge=true` ce qui
> supprime DEFINITIVEMENT sans passer par la corbeille de GLPI. Ne modifiez
> jamais ce comportement sans en parler avec l'equipe : une suppression
> accidentelle serait irrecuperable.

---

## FrontOffice (`src/views/frontoffice/`)

Espace ouvert aux utilisateurs finaux (pas de connexion).

### `FrontOfficeLayout.vue`
Cadre commun (menu + `<RouterView/>`), identique en fonctionnement a
`BackOfficeLayout.vue`.

### `frontoffficeAcceuil.vue`
Page d'accueil : juste des liens. Aucune donnee chargee.
(Note : le nom de fichier contient une faute de frappe historique —
`frontoffficeAcceuil` au lieu de `frontOfficeAccueil`. Ne le renommez pas
sans mettre a jour `router/index.js` en meme temps : le routeur l'importe
par son nom de fichier exact.)

### `ElementsPage.vue`
Tableau de tous les materiels du parc avec :
- une colonne **Image** (miniature) : image reellement uploadee dans GLPI
  via `services/document.js`, telechargee en parallele apres le chargement
  de la liste (`Promise.all` dans `services/elements.js`).
- une colonne **Personne** : le proprietaire du materiel (`users_id` dans GLPI,
  expose en texte grace a `expand_dropdowns`).
- une recherche texte et 4 filtres par menu deroulant (type, statut, lieu, fabricant).

> ⚠️ **Piege important** : le filtrage est **entierement realise en
> JavaScript, cote navigateur**, sur la liste deja chargee
> (`elementsFiltres` est un `computed` qui retravaille `elements.value`).
> **Aucune requete n'est renvoyee a l'API quand on tape ou qu'on choisit un
> filtre.** Avantage : l'interface est instantanee. Limite : si le parc
> contient des dizaines de milliers d'elements, tout est charge d'un coup au
> demarrage (potentiellement lent).
>
> ⚠️ **Piege images** : le chargement des images est fait en parallele
> (`Promise.all`) apres la liste principale. Si le serveur GLPI est lent ou
> si un document est inaccessible, l'image correspondante reste simplement
> vide (aucune erreur visible). L'image de repli locale (via `images.js`)
> est utilisee si GLPI n'en a pas.

### `NewTicketPage.vue`
Formulaire de creation de ticket avec selection multiple de materiels
(cases a cocher filtrables par recherche).

> ⚠️ **Piege : creation en 2 etapes non-atomiques.**
> ```js
> const cree = await ticket.create(input)        // etape A : cree le ticket
> for (const el of selection.value) {
>   await itemTicket.create(cree.id, el.type, el.id) // etape B : rattache chaque materiel
> }
> ```
> Si l'etape B echoue en cours de route (reseau coupe au 3e materiel sur 5,
> par exemple), le ticket existe deja dans GLPI mais seuls les 2 premiers
> materiels seront rattaches — et l'utilisateur verra un message d'erreur
> generique. C'est une limite connue de l'API GLPI (pas de creation "tout ou
> rien"). Si vous devez fiabiliser ce flux, il faudra envisager soit un
> rattrapage manuel cote GLPI, soit une logique de "retry"/nettoyage
> explicite ici.

### `AddCostPage.vue`
Formulaire d'ajout d'un cout (duree + cout temps + cout fixe) a un ticket
existant choisi dans une liste deroulante.

> ⚠️ **Piege** : les champs `<input type="number">` renvoient toujours du
> **TEXTE** via `v-model` (ex: `"600"`, pas `600`). Le code convertit
> explicitement avec `Number(...)` avant l'envoi a l'API :
> ```js
> const body = {
>   duration: Number(durationSecond.value),
>   cost_time: Number(timeCost.value),
>   cost_fixed: Number(fixedCost.value)
> }
> ```
> Si vous ajoutez un nouveau champ numerique, n'oubliez pas cette conversion
> — sinon GLPI recevra une chaine de caracteres la ou il attend un nombre.

### `TicketkabanPage.vue`
Tableau Kanban des tickets GLPI avec **3 colonnes fixes** :
`Nouveau` (statut 1) / `In progress` (statut 2) / `Termine` (statut 5).

Fonctionnalites :
- **Glisser-deposer** : on fait glisser une carte d'une colonne vers une autre
  pour changer le statut du ticket dans GLPI.
- **Dialogue "Terminer"** : passer un ticket en "Termine" (statut 5) ouvre
  une boite de dialogue qui demande la solution apportee (obligatoire). Cette
  solution est enregistree comme suivi (`itilFollowUp`) avant le changement
  de statut.
- **Clic sur une carte** : ouvre une fiche detaillee (couts, materiels rattaches).
- **Bouton "Ajouter 1 ticket"** : redirige vers `NewTicketPage.vue`.

**Personnalisation via le backend Spring Boot** : les couleurs de fond et le
nom de statut affiche en entete de colonne viennent de l'API Spring Boot
(`services/kanbanConfig.js` -> `GET /api/kanban-config`). La langue peut etre
configuree sur "Malgache" (noms personnalisables, ex: "vaovao", "efa manao",
"vita") ou "Anglais" (noms fixes : "New", "In progress", "Done").

> ⚠️ **Piege** : si le backend Spring Boot est eteint, `kanbanConfig.js`
> renvoie automatiquement la config par defaut (couleurs bleues/orangees/vertes,
> langue malgache) sans afficher d'erreur. Le Kanban reste donc utilisable,
> mais la personnalisation est ignoree jusqu'au redemarrage du backend.
>
> Pour changer la personnalisation : ouvrir
> `http://localhost:8080/kanban-config.html` (backend Spring Boot doit tourner),
> choisir la langue, les couleurs et les noms, puis cliquer "Enregistrer".
