# 2. Notions essentielles de JavaScript et Vue

Ce fichier explique le "vocabulaire" qui revient dans **toutes** les pages du
projet. Si un mot du code vous est etranger, il y a de fortes chances que sa
definition soit ici. Gardez cette page ouverte a cote du code la premiere fois.

---

## 2.1 Un fichier `.vue`, ca contient quoi ?

Chaque fichier `.vue` (un "composant") est decoupe en 3 blocs :

```vue
<template>
  <!-- Le HTML de la page : ce que l'utilisateur voit -->
</template>

<script setup>
  // Le JavaScript : les donnees et la logique de la page
</script>

<style scoped>
  /* Le CSS : l'apparence (couleurs, tailles, alignements...) */
  /* "scoped" = ce style ne s'applique qu'a CE composant, pas aux autres */
</style>
```

Cette documentation se concentre sur le bloc `<script setup>`, c'est-a-dire
la partie "logique" : c'est elle qui contient les subtilites.

---

## 2.2 `ref()` : une "boite" qui contient une valeur reactive

```js
import { ref } from 'vue'

const compteur = ref(0)
```

- `ref(0)` cree une boite contenant la valeur `0`.
- **Dans le `<script>`**, on lit/ecrit son contenu via `.value` :
  ```js
  console.log(compteur.value) // 0
  compteur.value = compteur.value + 1
  console.log(compteur.value) // 1
  ```
- **Dans le `<template>`**, Vue enleve automatiquement le `.value` :
  ```html
  <p>{{ compteur }}</p>
  ```

**"Reactif" veut dire quoi ?** Quand la valeur a l'interieur d'une `ref`
change, **tout l'affichage qui en depend se met a jour tout seul**, sans
recharger la page et sans que vous ayez a dire "rafraichis l'ecran". C'est la
magie principale de Vue : vous changez une donnee, l'ecran suit.

> ⚠️ **Piege n°1 du debutant** : oublier `.value` dans le `<script>`.
> `compteur = 5` ne fonctionnera pas (et provoquera une erreur), il faut
> `compteur.value = 5`. A l'inverse, **ne mettez jamais `.value` dans le
> `<template>`** (`{{ compteur.value }}` afficherait une erreur ou rien).

### Exemple concret tire du projet (`ResetPage.vue`)

```js
const enCours = ref(false) // "boite" qui dit si une suppression est en cours

// Plus tard, dans une fonction :
enCours.value = true   // on "allume" l'indicateur -> le bouton se desactive
//   ... travail ...
enCours.value = false  // on "eteint" l'indicateur -> le bouton se reactive
```

Et dans le `<template>` :
```html
<button :disabled="enCours">...</button>
```
Des que `enCours.value` passe a `true`, l'attribut `disabled` du bouton
apparait automatiquement (et inversement).

---

## 2.3 `computed()` : une valeur CALCULEE a partir d'autres `ref`

```js
import { ref, computed } from 'vue'

const prix = ref(100)
const quantite = ref(3)

const total = computed(() => prix.value * quantite.value)
```

- `total` n'est **pas** une donnee qu'on modifie soi-meme : c'est une
  **formule** qui se recalcule **automatiquement** des que `prix` ou
  `quantite` change. Un peu comme une cellule de tableur contenant `=A1*B1`.
- On lit sa valeur exactement comme une `ref` : `total.value` dans le script,
  `{{ total }}` dans le template.
- Avantage : Vue est assez malin pour ne refaire le calcul QUE si une des
  valeurs utilisees dedans a vraiment change (performance).

> ⚠️ **Piege** : n'essayez jamais d'ecrire dans un `computed`
> (`total.value = 10` provoquera une erreur). Si vous avez besoin d'une
> valeur modifiable, utilisez une `ref` normale.

### Exemple concret tire du projet (`DashboardPage.vue`)

```js
const materiels = ref({ Computer: [/* ... */], Monitor: [/* ... */] })

const totalMateriels = computed(() =>
  Object.values(materiels.value).reduce((somme, liste) => somme + liste.length, 0)
)
```

`totalMateriels` recalcule automatiquement le total des materiels des que le
contenu de `materiels` change (par exemple juste apres le chargement des
donnees depuis l'API). Voir la section 2.7 pour le detail de
`Object.values` / `.reduce`, qui peuvent dérouter au premier abord.

---

## 2.4 `onMounted()` : "fais ceci une fois la page affichee"

```js
import { ref, onMounted } from 'vue'

const tickets = ref([])

onMounted(async () => {
  tickets.value = await ticket.getAll()
})
```

`onMounted(fn)` execute `fn` **une seule fois**, juste apres que la page a
ete affichee a l'ecran pour la premiere fois. C'est l'endroit ideal — et
celui utilise systematiquement dans ce projet — pour **aller chercher les
donnees initiales depuis l'API** au chargement d'une page.

Schema du cycle de vie simplifie d'une page :
```
1. L'utilisateur arrive sur la page
2. Vue affiche le HTML avec les valeurs de depart des `ref` (souvent vides)
3. onMounted() se declenche -> on va chercher les vraies donnees a l'API
4. Les `ref` sont remplies -> Vue met l'affichage a jour automatiquement
```
C'est pour ça que beaucoup de pages affichent d'abord "Chargement..." (tant
que `enCours.value` vaut `true`), puis le contenu une fois les donnees
arrivees.

---

## 2.5 `async` / `await` et les "Promises" : attendre une reponse du serveur

Appeler l'API GLPI prend du temps (le navigateur doit envoyer une requete
sur le reseau et attendre la reponse). JavaScript ne "fige" jamais le
programme pendant ce temps : il continue a faire d'autres choses, et vous
recuperez le resultat **plus tard**, sous la forme d'une "Promise" (= "une
valeur qui sera disponible dans le futur").

`async` / `await` est la maniere la plus simple d'écrire du code qui attend
ces resultats, **comme s'il etait ecrit de façon classique, ligne par ligne** :

```js
async function chargerTickets() {
  const reponse = await ticket.getAll() // attend que la reponse arrive...
  tickets.value = reponse               // ...puis continue avec le resultat
}
```

Regles a retenir :
- Le mot-cle `await` ne peut etre utilise QUE dans une fonction marquee
  `async` (vous verrez toujours les deux ensemble).
- `await maFonction()` "met en pause" cette fonction (et seulement elle, pas
  toute l'application) jusqu'a ce que `maFonction()` ait fini son travail et
  renvoie un resultat.
- Toutes les fonctions des fichiers `services/*.js` qui parlent a l'API
  renvoient des Promises : c'est pour ça qu'on les appelle systematiquement
  avec `await` (et donc depuis une fonction `async`).

### `try / catch / finally` : gerer les erreurs proprement

Une requete vers l'API peut echouer (reseau coupe, droits insuffisants,
session expiree...). Le motif `try / catch / finally`, omnipresent dans ce
projet, permet de reagir proprement :

```js
async function chargerTickets() {
  enCours.value = true
  try {
    tickets.value = await ticket.getAll() // si ça plante, on saute direct au "catch"
  } catch (e) {
    erreur.value = e.message  // "e" est l'erreur ; e.message est son texte lisible
  } finally {
    enCours.value = false     // TOUJOURS execute, succes OU erreur
  }
}
```

- **`try`** : "essaie d'executer ce bloc"
- **`catch (e)`** : "si une erreur survient dans le `try`, fais ceci ; `e`
  contient l'erreur (son texte lisible est dans `e.message`)"
- **`finally`** : "quoi qu'il arrive (succes ou erreur), execute ceci a la
  fin" — tres utilise pour eteindre un indicateur de chargement (`enCours`)
  dans tous les cas, afin que le bouton ne reste jamais bloque.

---

## 2.6 `v-model` : relier un champ de formulaire a une `ref`

```html
<input v-model="titre" type="text" />
```
```js
const titre = ref('')
```

`v-model` cree une liaison **dans les deux sens** :
- quand l'utilisateur tape dans le champ, `titre.value` se met a jour ;
- si le code change `titre.value` (par exemple pour vider le formulaire
  apres l'envoi), le champ affiche a l'ecran se met aussi a jour.

C'est ce mecanisme qui permet, par exemple, de vider un formulaire apres
une creation reussie (voir `NewTicketPage.vue` : `titre.value = ''`, etc.)

---

## 2.7 Manipuler des listes et des objets : le "kit d'outils" JavaScript

Le code du projet utilise frequemment quelques fonctions de base sur les
tableaux (`[...]`) et les objets (`{...}`). Voici les plus importantes,
illustrees avec de petits exemples independants du projet :

| Outil | Ce qu'il fait | Exemple |
|---|---|---|
| `tableau.map(fn)` | Transforme chaque element et renvoie un NOUVEAU tableau de meme taille | `[1, 2, 3].map(x => x * 2)` → `[2, 4, 6]` |
| `tableau.filter(fn)` | Garde uniquement les elements pour lesquels `fn` renvoie `true` | `[1, 2, 3, 4].filter(x => x % 2 === 0)` → `[2, 4]` |
| `tableau.find(fn)` | Renvoie le PREMIER element qui correspond (ou `undefined` si aucun) | `[{id:1}, {id:2}].find(x => x.id === 2)` → `{id: 2}` |
| `tableau.reduce(fn, depart)` | "Accumule" une valeur en parcourant le tableau | voir ci-dessous |
| `tableau.join(sep)` | Colle tous les elements d'un tableau en un seul texte | `['a', 'b'].join(', ')` → `"a, b"` |
| `Object.values(objet)` | Renvoie un tableau contenant uniquement les VALEURS d'un objet | `Object.values({a: 1, b: 2})` → `[1, 2]` |
| `Object.fromEntries(paires)` | Construit un objet a partir d'une liste de paires `[cle, valeur]` | `Object.fromEntries([['a', 1], ['b', 2]])` → `{a: 1, b: 2}` |
| `new Set(...)` | Structure qui supprime automatiquement les doublons | `[...new Set([1, 1, 2])]` → `[1, 2]` |

### Zoom sur `.reduce()` — souvent le plus deroutant

`reduce` parcourt un tableau et construit petit a petit UNE seule valeur
finale (un total, une liste regroupee, etc.). Sa syntaxe :

```js
tableau.reduce((accumulateur, elementCourant) => /* nouvelle valeur de l'accumulateur */, valeurDeDepart)
```

Exemple pas a pas : faire la somme des longueurs de plusieurs listes
(c'est exactement ce que fait `totalMateriels` dans `DashboardPage.vue`) :

```js
const listes = [[1, 2], [3], [4, 5, 6]]

const total = listes.reduce((somme, liste) => somme + liste.length, 0)
//                            ^^^^^   ^^^^^                          ^
//                            |       |                              valeur de depart
//                            |       le tableau du tour courant
//                            le total accumule jusque-la

// Deroulement :
//   tour 1 : somme = 0 + [1, 2].length    = 0 + 2 = 2
//   tour 2 : somme = 2 + [3].length       = 2 + 1 = 3
//   tour 3 : somme = 3 + [4, 5, 6].length = 3 + 3 = 6
// resultat : 6
```

### Zoom sur `Object.values()` — attention a ne pas confondre avec le tableau qu'il contient

```js
const materiels = { Computer: ['PC-1', 'PC-2'], Monitor: ['Ecran-1'] }

Object.values(materiels)
// -> [ ['PC-1', 'PC-2'], ['Ecran-1'] ]
//     ^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^
//     un tableau de TABLEAUX (pas un tableau de chaines de caracteres !)
```

C'est exactement la situation dans `DashboardPage.vue` : `materiels.value`
est un objet `{ Computer: [...], Monitor: [...] }`, donc
`Object.values(materiels.value)` donne un tableau de tableaux, et chaque
"liste" manipulee ensuite par `.reduce` est un de ces sous-tableaux
(la liste des materiels d'UN type), pas l'objet `materiels` global.

### `objet[cle]` : lire une propriete dont le nom est variable

```js
const el = { name: 'PC-1', location: 'Bureau 2' }
const champ = 'location'

el[champ]      // -> 'Bureau 2'  (equivalent a el.location, mais le nom
               //                 du champ est decide au moment de l'execution)
```

Cette ecriture est utilisee dans `ElementsPage.vue` (fonction
`valeursDistinctes`) pour ecrire UNE SEULE fonction qui fonctionne pour
plusieurs champs differents (`status`, `location`, `manufacturer`...) plutot
que de dupliquer le meme code trois fois.

---

## 2.8 Vue Router : `RouterLink`, `RouterView`, `useRouter`

- **`<RouterLink :to="{ name: 'bo-dashboard' }">`** : un lien de navigation
  qui change de page **sans recharger tout le site** (contrairement a un
  `<a href="...">` classique). On cible la page par son **nom** (defini dans
  `src/router/index.js`), jamais par son URL ecrite en dur : si l'URL change
  un jour, les liens continueront de fonctionner.
- **`<RouterView />`** : un "emplacement" dans la mise en page ou Vue Router
  affiche automatiquement la page correspondant a l'URL actuelle. Utilise
  dans les fichiers `*Layout.vue` (le menu reste affiche, seul le contenu
  change).
- **`useRouter()`** : permet de changer de page **depuis le script** (et non
  depuis un clic sur un lien), par exemple apres une connexion reussie :
  ```js
  const router = useRouter()
  router.push({ name: 'backoffice-home' }) // redirige vers l'accueil
  ```

Voir [03-architecture-et-flux-de-donnees.md](./03-architecture-et-flux-de-donnees.md)
pour comprendre comment toutes ces pages s'articulent entre elles.
