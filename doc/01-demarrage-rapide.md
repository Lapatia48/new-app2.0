# 1. Demarrage rapide

## Lancer le projet en local

```sh
npm install     # installe les dependances (a faire une seule fois, ou apres
                # chaque modification de package.json)
npm run dev     # lance le serveur de developpement (rechargement automatique)
```

Le terminal affiche une adresse du type `http://localhost:5173` : ouvrez-la
dans votre navigateur.

Autres commandes utiles (definies dans `package.json`, section `scripts`) :

| Commande          | A quoi ca sert |
|-------------------|----------------|
| `npm run dev`     | Lance le site en local avec rechargement automatique des que vous modifiez un fichier. C'est ce que vous utiliserez 95% du temps. |
| `npm run build`   | Genere la version "prete pour la production" dans le dossier `dist/`. |
| `npm run preview` | Permet de tester localement la version generee par `npm run build`. |

## Le fichier `.env`

A la racine du projet, un fichier nomme `.env` (sans extension visible)
contient des reglages **prives** : identifiants, adresse de l'API GLPI, etc.
Il n'est **jamais envoye sur Git** (regarde `.gitignore`) car il contient des
informations sensibles propres a chaque environnement (local, production...).

Exemple de contenu attendu (les vraies valeurs sont confidentielles) :

```
# Identifiants pour se connecter au BackOffice (page login.vue)
VITE_BACKOFFICE_LOGIN=admin
VITE_BACKOFFICE_PASSWORD=motdepasse

# Adresse de l'API GLPI (passe par le proxy Vite "/glpi", voir vite.config.js)
VITE_GLPI_BASE=/glpi/apirest.php

# Identifiants du compte GLPI utilise par l'application pour parler a l'API
VITE_GLPI_USERNAME=glpi
VITE_GLPI_PASSWORD=glpi

# Jeton de l'application cote GLPI (Configuration > Generale > API)
VITE_GLPI_APP_TOKEN=xxxxxxxxxxxxxxxx
```

**Comment ces variables arrivent dans le code ?**
Vite (l'outil utilise pour lancer/compiler le projet) lit ce fichier `.env`
et remplace, au moment de la compilation, toute ecriture du type
`import.meta.env.VITE_XXX` par la valeur correspondante. Vous trouverez ces
lectures dans `login.vue` (identifiants du BackOffice) et `services/api.js`
(connexion a GLPI).

> ⚠️ **Piege courant** : si vous ajoutez une nouvelle variable dans `.env`,
> **redemarrez** `npm run dev` (Ctrl+C puis relancer). Vite ne recharge pas
> le fichier `.env` tout seul.

## Si rien ne s'affiche / erreur de connexion a l'API

1. Verifiez que GLPI tourne et est accessible a l'adresse configuree dans
   `vite.config.js` (le proxy `/glpi`).
2. Verifiez les identifiants dans `.env` (`VITE_GLPI_USERNAME` /
   `VITE_GLPI_PASSWORD` / `VITE_GLPI_APP_TOKEN`).
3. Ouvrez la console du navigateur (touche F12, onglet "Console" ou
   "Reseau") : les messages d'erreur de `services/api.js` y apparaissent et
   indiquent precisement quelle requete a echoue et pourquoi (voir le
   fichier `services/api.js`, qui construit des messages d'erreur explicites
   du type `"GET /Ticket a echoue (HTTP 401) : ..."`).
