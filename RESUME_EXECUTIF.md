# RÉSUMÉ EXÉCUTIF - Flux Commande CSV

## 🎯 Ce qui a été trouvé

### ✅ 1. CODE QUI CHARGE LE CSV (commande.csv)

**Fichier Source**: `new-app2.0/data/commande.csv`

**Parser**: 
- 📄 [src/services/import/csvParser.js](src/services/import/csvParser.js)
  - Fonction: `parseCsvFile(file)` 
  - Détecte délimiteur (`;`, `,`, `\t`)
  - Normalise headers
  - Retourne: `{ rows, headers, normalizedHeaders }`

---

### ✅ 2. CODE QUI APPELLE commandeAchatService

**Routes Frontend**:
- 🖥️ [src/views/backoffice/DataImportView.vue](src/views/backoffice/DataImportView.vue) → Import CSV unique
- 🖥️ [src/views/backoffice/ImportOneShot.vue](src/views/backoffice/ImportOneShot.vue) → Import complet (produit + stock + commande)

**Orchestrateur**:
- 🔗 [src/services/import/importService.js](src/services/import/importService.js)
  - Fonction: `importOrders(rows)`
  - Appelle: `createOrderFromCsvRow(row, config)` pour chaque ligne

**Service Principal**:
- 📋 [src/services/order/commandeAchatService.js](src/services/order/commandeAchatService.js)
  - **Fonction clé**: `createOrderFromCsvRow(row, config)`
  - Exécute 9 étapes pour créer une commande

---

### ✅ 3. CODE QUI AFFICHE/RÉCUPÈRE LES COMMANDES VIA API

**Lecture des Commandes**:
- 📊 [src/services/dto/GestionCommandeDto.js](src/services/dto/GestionCommandeDto.js)
  - Fonction: `listGestionCommandes()` → Récupère toutes commandes
  - Fonction: `buildGestionCommandeDto(orderId)` → Détail une commande

**Affichage Frontend**:
- 🖥️ [src/views/backoffice/BackOfficeOrdersView.vue](src/views/backoffice/BackOfficeOrdersView.vue)
  - Appelle: `listGestionCommandes()`
  - Affiche tableau avec ID, Date, Client, Total, État

---

## 📁 FICHIERS DE CONFIGURATION

### Configuration Application
- 📝 `.env` - Variables d'environnement (API key, URLs, IDs par défaut)
- 🗂️ `src/router/index.js` - Routes (3 pages principales)
- 📦 `package.json` - Dépendances (Vue 3, Vite)
- ⚙️ `vite.config.js` - Configuration Vite

### Données de Test
- 📊 `data/commande.csv` - Commandes de test
- 📊 `data/produit.csv` - Produits de test
- 📊 `data/stock.csv` - Stock de test

---

## 🌐 ENDPOINTS API UTILISÉS

### Lecture (GET)
```
GET /api/orders                                    # Lister IDs
GET /api/orders/{id}?display=full                  # Détail commande
GET /api/customers/{id}?display=full               # Détail client
GET /api/carts/{id}?display=full                   # Détail panier
GET /api/addresses/{id}?display=full               # Détail adresse
GET /api/products?filter[reference]={ref}          # Chercher produit
GET /api/product_options                           # Options produits
GET /api/product_option_values                     # Valeurs options
GET /api/combinations                              # Variations produits
GET /api/images/products/{id}                      # Images produits
```

### Création (POST)
```
POST /api/customers              # Créer client
POST /api/addresses              # Créer adresse
POST /api/carts                  # Créer panier
POST /api/orders                 # Créer commande
POST /api/order_details          # Ajouter ligne commande
POST /api/order_histories        # Historique commande
```

---

## 🔧 SERVICES IMPLIQUÉS

### Services de Commande
| Service | Rôle |
|---------|------|
| [commandeAchatService.js](src/services/order/commandeAchatService.js) | Crée commande depuis CSV |
| [GestionCommandeDto.js](src/services/dto/GestionCommandeDto.js) | Lit/formate commandes |

### Services Entities (CRUD via API)
| Service | Endpoint |
|---------|----------|
| [ordersService.js](src/services/entities/ordersService.js) | `/api/orders` |
| [orderDetailsService.js](src/services/entities/orderDetailsService.js) | `/api/order_details` |
| [orderHistoriesService.js](src/services/entities/orderHistoriesService.js) | `/api/order_histories` |
| [customersService.js](src/services/entities/customersService.js) | `/api/customers` |
| [addressesService.js](src/services/entities/addressesService.js) | `/api/addresses` |
| [cartsService.js](src/services/entities/cartsService.js) | `/api/carts` |
| [productsService.js](src/services/entities/productsService.js) | `/api/products` |
| [combinationsService.js](src/services/entities/combinationsService.js) | `/api/combinations` |
| [productOptionValuesService.js](src/services/entities/productOptionValuesService.js) | `/api/product_option_values` |

### Services HTTP
| Service | Rôle |
|---------|------|
| [prestashopClient.js](src/services/http/prestashopClient.js) | Client HTTP (GET, POST, PUT, DELETE) |
| [xmlUtils.js](src/services/xml/xmlUtils.js) | Parse/sérialisation XML |

---

## 📊 FLUX DE DONNÉES

```
commande.csv
    ↓
[DataImportView.vue ou ImportOneShot.vue]
    ↓
csvParser.parseCsvFile()  → Array<Row>
    ↓
importService.runImport()  → importOrders(rows)
    ↓
commandeAchatService.createOrderFromCsvRow(row, config)
    │
    ├─→ Parse items [("REF"; qty; "attr")]
    ├─→ Get/Create Customer
    ├─→ Create Address
    ├─→ Resolve Products & Combinations
    ├─→ Create Cart
    ├─→ Compute Totals
    ├─→ Create Order (POST /api/orders)
    ├─→ Create Order Details (POST /api/order_details)
    └─→ Create Order History (POST /api/order_histories)
    ↓
OrderID créé ✓
    ↓
[BackOfficeOrdersView.vue]
    ↓
GestionCommandeDto.listGestionCommandes()
    │
    ├─→ GET /api/orders → [123, 122, 121, ...]
    ├─→ for each:
    │   ├─→ GET /api/orders/{id}?display=full
    │   ├─→ GET /api/customers/{id}?display=full
    │   ├─→ GET /api/addresses/{id}?display=full
    │   ├─→ GET /api/carts/{id}?display=full
    │   └─→ Parse order_rows
    └─→ Retourne: Array<GestionCommandeDto>
    ↓
Tableau affiché ✓
```

---

## 📋 STRUCTURE CSV ATTENDUE

```csv
email;nom;pwd;adresse;achat;etat
john@example.com;Jean Dupont;pass123;123 Rue Main;[("PRD001"; 2; "Taille M") ("PRD002"; 1; "")];en attente
marie@example.com;Marie Martin;pass456;456 Rue Side;[("PRD001"; 1; "")];acceptee
```

**Colonnes CSV**:
- `email` (string) - E-mail client [REQUIS]
- `nom` (string) - Nom client
- `pwd` (string) - Mot de passe
- `adresse` (string) - Adresse livraison
- `achat` (string) - Format spécial: `[("reference"; quantity; "attribut") ...]` [REQUIS]
- `etat` (string) - État commande

**Format achat**:
- `("PRD001"; 2; "Taille M")` = Produit PRD001, quantité 2, avec attribut "Taille M"
- `("PRD002"; 1; "")` = Produit PRD002, quantité 1, sans attribut

---

## 🔑 CONFIGURATION (.env)

```env
# API PrestaShop
VITE_PS_API_BASE_URL=/prestashop/api
VITE_PS_API_KEY=rnXhBF5axIxmpIeCKMvEH0BS8GSrhX1V

# Valeurs Métier par Défaut
VITE_DEFAULT_LANG_ID=1
VITE_DEFAULT_SHOP_ID=1
VITE_DEFAULT_CURRENCY_ID=1
VITE_DEFAULT_CARRIER_ID=1
VITE_DEFAULT_WAREHOUSE_ID=1

# États Commande
VITE_ORDER_STATE_PENDING_ID=10   # En attente
VITE_ORDER_STATE_PAID_ID=2       # Acceptée
VITE_ORDER_STATE_ERROR_ID=8      # Échec
```

---

## 🎮 COMMENT UTILISER

### 1️⃣ Import Fichier Unique
```
1. Allez à: /backoffice/import
2. Sélectionnez: commande.csv
3. Cliquez: "Import commandes (CSV)"
4. Résultat: Commandes créées dans PrestaShop
```

### 2️⃣ Import Complet
```
1. Allez à: /backoffice/import-oneshot
2. Sélectionnez dossier avec:
   - produit.csv
   - stock.csv
   - commande.csv
   - dossier images/
3. Import automatique dans l'ordre
4. Résultat: Produits + Stock + Commandes + Images
```

### 3️⃣ Voir les Commandes
```
1. Allez à: /backoffice/orders
2. Tableau affiche toutes les commandes
3. Click sur ligne: Voir détails (modal)
```

---

## ✨ EXEMPLE COMPLET

**CSV Input**:
```csv
email;nom;pwd;adresse;achat;etat
john@example.com;Jean Dupont;pass123;123 Main St;[("PRD-001"; 2; "")];en attente
```

**Résultat Attendu**:
1. ✅ Client créé: "jean-dupont@example.com"
2. ✅ Adresse créée: "123 Main St, Antananarivo, 101"
3. ✅ Panier créé avec 2x PRD-001
4. ✅ Commande créée (ID: 42)
5. ✅ Ligne commande ajoutée (qty: 2)
6. ✅ Historique enregistré (état: en attente)

**API Calls Exécutés**:
```
POST /api/customers              ✓ Client ID: 5
POST /api/addresses              ✓ Address ID: 12
POST /api/carts                  ✓ Cart ID: 8
POST /api/orders                 ✓ Order ID: 42
POST /api/order_details          ✓ Detail ID: 87
POST /api/order_histories        ✓ History ID: 99
```

**Affichage**:
```
| ID | Date       | Client            | Total | État      |
|----|------------|-------------------|-------|-----------|
| 42 | 2024-01-15 | Jean Dupont (...) | 250€  | en attente |
```

---

## 📍 POINTS CLÉ À RETENIR

✅ **Fichier CSV Source**: `new-app2.0/data/commande.csv`

✅ **Parser Principal**: [csvParser.js](src/services/import/csvParser.js)::parseCsvFile()

✅ **Importer**: [importService.js](src/services/import/importService.js)::importOrders()

✅ **Service Clé**: [commandeAchatService.js](src/services/order/commandeAchatService.js)::createOrderFromCsvRow()

✅ **Lecteur Commandes**: [GestionCommandeDto.js](src/services/dto/GestionCommandeDto.js)::listGestionCommandes()

✅ **3 Vues Frontend**: 
  - [DataImportView.vue](src/views/backoffice/DataImportView.vue) - Import CSV
  - [ImportOneShot.vue](src/views/backoffice/ImportOneShot.vue) - Import complet
  - [BackOfficeOrdersView.vue](src/views/backoffice/BackOfficeOrdersView.vue) - Affichage

✅ **API Base**: `/prestashop/api` (défini dans `.env`)

✅ **Config**: `.env` avec 20+ variables

---

## 📚 DOCUMENTATION COMPLÈTE

Voir aussi:
- [FLUX_COMMANDES_DOCUMENTATION.md](FLUX_COMMANDES_DOCUMENTATION.md) - Documentation détaillée complète
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Index rapide des fonctions
- Diagramme de flux (voir ci-dessus)

---

**Recherche Thorough ✓**  
**Tous les fichiers trouvés ✓**  
**Documentation générée ✓**
