# Guide rapide - API GLPI v1 (apirest.php)

Ce projet utilise l'**API REST v1** de GLPI (`apirest.php`). Voici l'essentiel
pour démarrer et comprendre comment l'app s'en sert.

## 1. Pré-requis côté GLPI

Dans GLPI : **Configuration > Générale > onglet API**
- Activer **« Activer l'API REST »**.
- Activer **« Activer la connexion avec identifiants »** (login / mot de passe).
- (Optionnel) Créer un **client API** avec un *App-Token* si on veut filtrer les accès.

URL de base : `http://glpi.local/apirest.php`

## 2. Obtenir un jeton de session (initSession)

Contrairement à la v2.3 (OAuth avec client_id/secret), la v1 utilise un simple
login/mot de passe encodés en **Basic Auth**, et renvoie un `session_token`.

```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'glpi:glpi' | base64)" \
  "http://glpi.local/apirest.php/initSession"

# Réponse : { "session_token": "83af7e620c83a50a18d3eac2f6ed05a3ca0bea62" }
```

Ensuite, **chaque appel** doit envoyer l'en-tête `Session-Token: <le jeton>`
(et `App-Token` si configuré).

> Dépannage : si `initSession` renvoie une erreur d'authentification alors que
> le login/mot de passe sont bons, c'est qu'Apache ne transmet pas l'en-tête
> `Authorization` à PHP. Ajouter dans le `.htaccess`/vhost de GLPI :
> `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` (ou utiliser un
> *user_token* à la place du couple login/mot de passe).

## 3. Opérations de base

| Action            | Méthode + URL                         | Corps                          |
|-------------------|---------------------------------------|--------------------------------|
| Lister            | `GET /Computer?range=0-9999`          | (vide)                         |
| Lire un élément   | `GET /Computer/15`                    | (vide)                         |
| Créer             | `POST /Computer`                      | `{ "input": { "name": "..." } }` |
| Modifier          | `PUT /Computer/15`                    | `{ "input": { "otherserial": "X" } }` |
| Supprimer (final) | `DELETE /Computer/15?force_purge=true`| (vide)                         |

- Astuce : `?expand_dropdowns=true` renvoie le **nom** des dropdowns au lieu de l'id.
- Les listes GET sont paginées (défaut `0-49`) → on passe `range=0-9999`.

## 4. Cas spéciaux utilisés par l'app

**Upload réel d'une image** (multipart) puis rattachement à un matériel :
```
POST /Document            (multipart/form-data)
  - uploadManifest = {"input": {"name": "PC-LAB-002", "_filename": ["PC-LAB-002.jpeg"]}}
  - filename[0]    = <le fichier>
POST /Document_Item       { "input": { "documents_id": <id>, "itemtype": "Computer", "items_id": <id> } }
```

**Rattacher un matériel à un ticket** (vrai lien, pas la description) :
```
POST /Item_Ticket  { "input": { "tickets_id": <id>, "itemtype": "Computer", "items_id": <id> } }
```

**Coût d'un ticket** :
```
POST /TicketCost   { "input": { "tickets_id": <id>, "actiontime": 600, "cost_time": 8.7, "cost_fixed": 50 } }
```

## 5. Configuration dans le projet

Tout est centralisé dans `.env` :
```
VITE_GLPI_BASE=/glpi/apirest.php   # via le proxy Vite (évite les CORS)
VITE_GLPI_USERNAME=glpi
VITE_GLPI_PASSWORD=glpi
VITE_GLPI_APP_TOKEN=               # vide si non configuré
```
Le proxy `/glpi -> http://glpi.local` est défini dans `vite.config.js`.

Le client se trouve dans `src/services/api.js` (initSession + get/post/put/del +
upload). Les autres services (`computer.js`, `ticket.js`, `document.js`,
`itemTicket.js`, ...) ne font qu'utiliser ces fonctions.

## 6. Documentation Swagger

Un OpenAPI des endpoints utilisés est généré en ligne de commande :
```
npm run gen:apiv1      # produit apiv1.json
```
Ouvrir `apiv1.json` dans https://editor.swagger.io pour une vue interactive.
La doc officielle complète reste `C:\xampp\htdocs\glpi\apirest.md`.
