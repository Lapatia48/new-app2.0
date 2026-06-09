# Configuration SQLite du backend `eval` (pour reprendre sans IA)

Ce backend Spring Boot stocke **la personnalisation du tableau Kanban**
(les 3 couleurs de fond + les noms de statut en malgache) dans une petite
base **SQLite** : un simple fichier `kanban.db`.

Ce document explique, pas a pas, comment ca marche. Aucune experience
prealable en Java ou en SQLite n'est requise.

---

## 1. SQLite, c'est quoi ?

SQLite est une base de donnees **rangee dans un seul fichier** (`kanban.db`).
Pas de serveur a installer ni a demarrer : le fichier EST la base.

Vous avez deja l'outil en ligne de commande (vous l'avez verifie) :

```
C:\Users\Lapatia> sqlite3 --version
3.53.2 ...
```

> Note : l'outil `sqlite3.exe` sert seulement a **regarder** la base a la main.
> Le backend, lui, n'en a PAS besoin : Java parle a SQLite tout seul grace au
> pilote `sqlite-jdbc` (voir plus bas). Rien d'autre a configurer.

---

## 2. PDO (PHP) vs JDBC (Java) : la meme idee

Si vous connaissez **PDO** en PHP, JDBC en Java fait exactement la meme chose.
Voici la table de correspondance :

| Etape                  | PHP (PDO)                                         | Java (JDBC)                                                        |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Se connecter           | `$pdo = new PDO("sqlite:kanban.db");`             | `Connection cnx = DriverManager.getConnection("jdbc:sqlite:kanban.db");` |
| Preparer une requete   | `$stmt = $pdo->prepare("... WHERE id = ?");`      | `PreparedStatement ps = cnx.prepareStatement("... WHERE id = ?");` |
| Remplir un parametre   | `$stmt->execute([$valeur]);`                      | `ps.setString(1, valeur); ps.executeUpdate();`                     |
| Lire les resultats     | `$ligne = $stmt->fetch();`                        | `ResultSet rs = ps.executeQuery(); rs.next();`                     |
| Fermer                 | (automatique en fin de script)                    | `try (...) { }` ferme tout seul a la fin du bloc                   |

Le `?` dans la requete (appele "requete preparee") sert dans les **deux**
langages a se proteger des **injections SQL** : on ne colle jamais une valeur
directement dans le texte de la requete.

Tout ce code JDBC est regroupe dans **un seul fichier** :
[`KanbanConfigRepository.java`](../src/main/java/com/eval/eval/KanbanConfigRepository.java).
C'est le seul fichier qui parle a SQLite ; lisez-le, il est commente ligne a ligne.

---

## 3. Ou est branche SQLite dans le projet ?

Deux choses seulement ont ete ajoutees :

1. **Le pilote SQLite** dans [`pom.xml`](../pom.xml) (c'est lui qui rend
   possible `jdbc:sqlite:...`) :

   ```xml
   <dependency>
       <groupId>org.xerial</groupId>
       <artifactId>sqlite-jdbc</artifactId>
       <version>3.46.1.3</version>
   </dependency>
   ```

2. **Le chemin du fichier .db** dans
   [`application.properties`](../src/main/resources/application.properties) :

   ```properties
   kanban.db.path=kanban.db
   ```

   Pour mettre la base ailleurs, indiquez un chemin complet, par exemple :
   `kanban.db.path=C:/Users/Lapatia/kanban.db`.

Le fichier `kanban.db`, la table et une ligne par defaut sont **crees
automatiquement au premier demarrage** (voir la methode `creerTableSiBesoin()`
dans le repository). Vous n'avez aucune commande SQL a taper a la main.

---

## 4. La table utilisee

Une seule table, avec **une seule ligne** (`id = 1`), car il n'y a qu'un seul
tableau Kanban a personnaliser :

```sql
CREATE TABLE IF NOT EXISTS kanban_config (
  id               INTEGER PRIMARY KEY,
  couleur_nouveau  TEXT,   -- ex: "#dbeafe"
  couleur_encours  TEXT,   -- ex: "#fde7c8"
  couleur_termine  TEXT,   -- ex: "#d7f0dc"
  nom_mg_nouveau   TEXT,   -- ex: "vaovao"
  nom_mg_encours   TEXT,   -- ex: "efa manao"
  nom_mg_termine   TEXT    -- ex: "vita"
);
```

---

## 5. Lancer le backend

Depuis le dossier `eval/` :

```
.\mvnw.cmd spring-boot:run
```

Le backend demarre sur le port **8080**. Ensuite :

- Page de configuration (formulaire) :
  <http://localhost:8080/kanban-config.html>
- API lue par le tableau Kanban (Vue) :
  - `GET  http://localhost:8080/api/kanban-config`  -> lit la config
  - `POST http://localhost:8080/api/kanban-config`  -> enregistre la config

---

## 6. Regarder la base a la main (facultatif)

Pour verifier ce qui est enregistre, ouvrez le fichier avec l'outil `sqlite3` :

```
C:\...\eval> sqlite3 kanban.db
sqlite> .tables
kanban_config
sqlite> SELECT * FROM kanban_config;
1|#dbeafe|#fde7c8|#d7f0dc|vaovao|efa manao|vita
sqlite> .quit
```

> Astuce : tapez `.mode column` puis `.headers on` avant le `SELECT` pour un
> affichage en colonnes plus lisible.

---

## 7. Resume du "voyage" d'une couleur

```
Page kanban-config.html  --(POST JSON)-->  KanbanConfigController
        ^                                          |
        | (GET JSON)                               v
        |                                  KanbanConfigRepository  --(JDBC)-->  kanban.db
        |                                          ^
Tableau Kanban (Vue, frontoffice)  --(GET JSON)----+
```

- La **page de config** ecrit les valeurs.
- Le **tableau Kanban** du frontoffice les relit pour colorer les colonnes et
  afficher les noms en malgache.
