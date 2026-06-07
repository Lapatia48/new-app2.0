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
Selection de 3 fichiers CSV (ordre fixe : materiels, tickets, couts) + une
archive `.zip` d'images optionnelle, puis appel a `runImport()`.

> ⚠️ **Piege** : le nom des fichiers n'a AUCUNE importance, seul l'ORDRE de
> selection compte. Les en-tetes (premiere ligne du CSV) sont ensuite
> verifies pour confirmer qu'on a bien le bon fichier a la bonne position
> (voir `EXPECTED_HEADERS` dans `services/importData.js`). Si un utilisateur
> inverse 2 fichiers, l'import echouera avec un message "Colonnes
> incorrectes" — c'est le comportement attendu, pas un bug.
>
> ⚠️ En cas d'erreur pendant l'import, **`runImport` relance automatiquement
> un `resetAll`** pour nettoyer les donnees partiellement importees (voir le
> commentaire en tete de `services/importData.js`). La page affiche alors
> simplement "Import annule. Verifiez les fichiers puis recommencez." — le
> vrai message d'erreur (colonne incorrecte, valeur invalide...) est dans le
> journal AVANT cette ligne, regardez bien tout l'historique affiche.

### `ResetPage.vue`
Un bouton qui supprime DEFINITIVEMENT tickets + materiels (pour repartir sur
une base propre avant un nouvel import). Demande une confirmation
(`confirm(...)`, popup native du navigateur) avant de lancer la suppression.

> ⚠️ **Action irreversible.** `resetAll` utilise `force_purge=true` (voir
> `services/parcElement.js` / `services/ticket.js`), ce qui supprime
> DEFINITIVEMENT sans passer par la corbeille de GLPI. Ne modifiez jamais ce
> comportement sans en parler avec l'equipe : une suppression accidentelle
> serait irrecuperable.

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
Tableau de tous les materiels du parc avec recherche texte + 4 filtres par
menu deroulant (type, statut, lieu, fabricant).

> ⚠️ **Piege important** : le filtrage est **entierement realise en
> JavaScript, cote navigateur**, sur la liste deja chargee
> (`elementsFiltres` est un `computed` qui retravaille `elements.value`).
> **Aucune requete n'est renvoyee a l'API quand on tape ou qu'on choisit un
> filtre.** Avantage : l'interface est instantanee. Limite : si le parc
> contient des dizaines de milliers d'elements, tout est charge d'un coup au
> demarrage (potentiellement lent). Si ce cas se presente un jour, il
> faudrait passer a un filtrage cote serveur (parametres dans la requete
> GLPI), ce qui changerait significativement la logique de cette page.

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
