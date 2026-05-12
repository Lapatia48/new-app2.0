# Index Rapide - Fichiers & Fonctions Clés

## 📋 Table des Matières

- [CSV & Parsing](#csv--parsing)
- [Import & Orchestration](#import--orchestration)
- [Création Commande](#création-commande)
- [Affichage Commandes](#affichage-commandes)
- [Services Entities (CRUD)](#services-entities-crud)
- [HTTP & Configuration](#http--configuration)
- [Frontend Vues](#frontend-vues)
- [Templates & Constants](#templates--constants)

---

## CSV & Parsing

### `src/services/import/csvParser.js`
```javascript
export async function parseCsvFile(file, options = {})
  // Parse un fichier CSV
  // Retourne: { delimiter, headers, normalizedHeaders, rows }
  // Détecte le délimiteur: ;, ,, \t

export function parseCsvText(text, options = {})
  // Parse du texte CSV

function buildNormalizedHeaders(rawHeaders)
  // Normalise les noms de colonnes (minuscules, espaces→underscores)

function detectDelimiter(line)
  // Détecte le séparateur

function parseLine(line, delimiter)
  // Parse une ligne CSV (gère quotes et échappement)
```

**Utilisation**:
```javascript
const file = document.querySelector('input[type="file"]').files[0]
const parsed = await parseCsvFile(file)
console.log(parsed.rows)  // Array of row objects
```

---

## Import & Orchestration

### `src/services/import/importService.js`
```javascript
export async function runImport({ target, rows = [], files = [] })
  // target: 'products' | 'stocks' | 'orders' | 'images'
  // Dispatch vers importProducts, importStocks, importOrders, importImages
  // Retourne: { total, success }

async function importOrders(rows)
  // Pour chaque row:
  //   createOrderFromCsvRow(row, config)
  // Retourne: { total, success }

async function importProducts(rows)
  // Crée/met à jour produits depuis CSV

async function importStocks(rows)
  // Définit quantités de stock

async function importImages(files)
  // Upload images produits
```

**Utilisation**:
```javascript
const result = await runImport({ target: 'orders', rows: csvData })
console.log(`Commandes créées: ${result.success}/${result.total}`)
```

### `src/services/import/importServiceOneShot.js`
```javascript
export async function runImportOneShot({ files = [] })
  // Import complet en une seule opération
  // Recherche dans files: produit.csv, stock.csv, commande.csv
  // Récupère images/ folder
  // Exécute:
  //   1. importProducts()
  //   2. importStocks()
  //   3. importOrders()
  //   4. importImages()
  // Retourne: { products, stocks, orders, images }

const CSV_FILES = {
  products: 'produit.csv',
  stocks: 'stock.csv',
  orders: 'commande.csv'
}
```

**Utilisation**:
```javascript
const result = await runImportOneShot({ files: selectedFolderFiles })
console.log(result.orders)  // { total, success }
```

---

## Création Commande

### `src/services/order/commandeAchatService.js`

#### Fonction Principale
```javascript
export async function createOrderFromCsvRow(row, config)
  // Crée une commande à partir d'une ligne CSV
  // row: { email, nom, pwd, adresse, achat, etat }
  // config: buildOrderConfig()
  // Retourne: orderId (integer)
```

#### Étapes Internes
```javascript
parseOrderItems(raw)
  // Parse format: [("REF"; qty; "attr") ...]
  // Retourne: Array<{ reference, quantity, karazany }>

async function ensureCustomer(row, config)
  // Trouve client par email ou le crée
  // Retourne: customerId

async function createAddressForCustomer(customerId, row, config)
  // Crée adresse de livraison
  // Retourne: addressId

async function resolveOrderItems(orderItems)
  // Pour chaque item: trouve produit et variation
  // Retourne: Array<{ id, name, price, quantity, productAttributeId }>

async function createCartForOrder(customerId, addressId, items, config)
  // Crée panier avec items
  // Retourne: cartId

function computeOrderTotals(resolvedItems)
  // Calcule totalProducts, totalPaid, etc.
  // Retourne: { totalPaid, totalProducts, totalDiscounts, ... }

function resolveOrderStateId(stateName, config)
  // Map 'en attente' → VITE_ORDER_STATE_PENDING_ID
```

#### Configuration
```javascript
export function buildOrderConfig()
  // Construit config depuis .env
  // Retourne: {
  //   langId, shopId, shopGroupId, currencyId, countryId, stateId,
  //   customerGroupId, carrierId, warehouseId,
  //   defaultCity, defaultPostcode, cashModule,
  //   orderStatePendingId, orderStatePaidId, orderStateErrorId
  // }

export function validateOrderConfig(config)
  // Vérifie configuration minimale
  // Throws si manquent: currencyId, langId, shopId, shopGroupId,
  //                     carrierId, warehouseId, orderStatePendingId
```

#### Helpers
```javascript
function parseOrderItems(raw)
  // Parse achat: [("PRD001"; 2; "Taille M")]

async function fetchCustomerSecureKey(customerId)
  // API: GET /api/customers/{id}?display=full
  // Retourne: secure_key

function formatMoney(value)
  // 12.5 → "12.50"
```

**Utilisation**:
```javascript
const config = buildOrderConfig()
validateOrderConfig(config)
const orderId = await createOrderFromCsvRow(row, config)
```

### `src/services/order/achatCommande.js`
```javascript
export const achatCommandeTemplate = {
  client: { nom, email, pwd, adresse },
  achats: [ { reference, quantite, karazany } ],
  etat: 'en attente paiement a la livraison'
}
```

---

## Affichage Commandes

### `src/services/dto/GestionCommandeDto.js`

#### Fonction Principale
```javascript
export async function listGestionCommandes()
  // Récupère toutes les commandes avec détails complets
  // Retourne: Array<GestionCommandeDto>

export async function buildGestionCommandeDto(orderId)
  // Construit DTO pour une commande spécifique
  // Fetch en parallèle:
  //   - Order full
  //   - Customer full
  //   - Cart full
  //   - Addresses full
  //   - Order rows
  // Retourne: GestionCommandeDto
```

#### Helpers
```javascript
async function fetchOrderFull(orderId)
  // API: GET /api/orders/{id}?display=full

async function fetchCustomerFull(customerId)
  // API: GET /api/customers/{id}?display=full

async function fetchCartFull(cartId)
  // API: GET /api/carts/{id}?display=full

async function fetchAddressFull(addressId)
  // API: GET /api/addresses/{id}?display=full

async function fetchOrderRows(orderObj)
  // Parse order.associations.order_rows
  // Retourne: Array<OrderRow>

async function fetchFirstProductImageUrl(productId, cache)
  // Récupère première image du produit

function normalizeOrderRow(row)
  // Formate ligne commande pour affichage

function getCustomerDisplayName(customer)
  // Retourne: "FirstName LastName (email)"

function formatStateLabel(stateId, config)
  // Map stateId → label ("acceptee", "echec", "en attente")
```

**Utilisation**:
```javascript
const orders = await listGestionCommandes()
orders.forEach(dto => {
  console.log(dto.summary)  // { id, date, customerName, totalPaid, currentStateLabel }
})
```

---

## Services Entities (CRUD)

### Pattern Générique: `src/services/entities/crud.js`
```javascript
export function createCrud(resource, tag)
  // resource: 'orders', 'customers', 'addresses', etc.
  // tag: 'order', 'customer', 'address', etc.
  // Retourne objet avec: listIds(), read(id), create(data), update(id, data), remove(id)
```

### Services CRUD

| Service | Resource | Tag | Fonction |
|---------|----------|-----|----------|
| `ordersService.js` | orders | order | CRUD Order |
| `orderDetailsService.js` | order_details | order_detail | CRUD Order Detail |
| `orderHistoriesService.js` | order_histories | order_history | CRUD Order History |
| `customersService.js` | customers | customer | CRUD + findCustomerIdByEmail |
| `addressesService.js` | addresses | address | CRUD |
| `cartsService.js` | carts | cart | CRUD |
| `productsService.js` | products | product | CRUD + findProductInfoByReference |
| `combinationsService.js` | combinations | combination | CRUD + findCombinationByProductAndValueId |
| `productOptionValuesService.js` | product_option_values | product_option_value | CRUD + findProductOptionValueIdByName |

### `src/services/entities/ordersService.js`
```javascript
export const listOrderIds = crud.listIds          // GET /api/orders
export const readOrder = crud.read                // GET /api/orders/{id}
export const createOrder = crud.create            // POST /api/orders
export const updateOrder = crud.update            // PUT /api/orders/{id}
export const deleteOrder = crud.remove            // DELETE /api/orders/{id}
```

### `src/services/entities/customersService.js`
```javascript
export async function findCustomerIdByEmail(email)
  // GET /api/customers?filter[email]={email}

export async function createCustomer(data)
  // POST /api/customers
  // data: { id_lang, id_shop, firstname, lastname, email, passwd, ... }
```

### `src/services/entities/productsService.js`
```javascript
export async function findProductInfoByReference(reference)
  // GET /api/products?filter[reference]={reference}
  // Retourne: { id, name, price, ... }

export async function findProductIdByReference(reference)
  // Retourne: product.id
```

### `src/services/entities/combinationsService.js`
```javascript
export async function findCombinationByProductAndValueId(productId, valueId)
  // GET /api/combinations?filter[id_product]={productId}
  // Retourne: combination.id
```

---

## HTTP & Configuration

### `src/services/http/prestashopClient.js`
```javascript
export async function getXml(path, query)
  // GET request avec retour XML
  // Ajoute automatiquement ws_key query param

export async function postXml(resource, xml)
  // POST request (CREATE) avec body XML

export async function putXml(path, xml)
  // PUT request (UPDATE) avec body XML

export async function deleteXml(path, ...)
  // DELETE request

function buildUrl(path, query)
  // Construit URL avec base et query params

export const buildApiUrl = (path) => ...
  // Construit URL complète pour affichage
```

**Utilisation**:
```javascript
const xml = await getXml('orders/123')
const orderId = await postXml('orders', xmlBody)
```

### `src/services/xml/xmlUtils.js`
```javascript
export function parseXml(xmlString)
  // Parse XML → DOM

export function getText(element)
  // Récupère texte d'un élément

export function xmlToJson(xmlString)
  // Convertit XML → JSON

export function buildEntityXml(tag, data)
  // Construit XML pour POST/PUT

export function getIdFromXml(responseXml, tag)
  // Extrait ID de réponse API
```

### `.env` Configuration
```env
VITE_PS_API_BASE_URL=/prestashop/api
VITE_PS_API_KEY=rnXhBF5axIxmpIeCKMvEH0BS8GSrhX1V
VITE_DEFAULT_LANG_ID=1
VITE_DEFAULT_SHOP_ID=1
VITE_DEFAULT_CURRENCY_ID=1
VITE_DEFAULT_COUNTRY_ID=8
VITE_DEFAULT_CUSTOMER_GROUP_ID=3
VITE_DEFAULT_CARRIER_ID=1
VITE_DEFAULT_WAREHOUSE_ID=1
VITE_DEFAULT_CITY=Antananarivo
VITE_DEFAULT_POSTCODE=101
VITE_CASH_MODULE=ps_cashondelivery
VITE_ORDER_STATE_PENDING_ID=10
VITE_ORDER_STATE_PAID_ID=2
VITE_ORDER_STATE_ERROR_ID=8
```

---

## Frontend Vues

### `src/views/backoffice/DataImportView.vue`
```vue
<script setup>
import { parseCsvFile } from '@/services/import/csvParser'
import { runImport } from '@/services/import/importService'

async function onCsvSelected(event)
  // Parse fichier CSV sélectionné

async function startImport(target)
  // target: 'products' | 'stocks' | 'orders' | 'images'
  // Appelle runImport({ target, rows })
</script>

<template>
  <!-- Boutons: -->
  <!--   "Import produits (CSV)" -->
  <!--   "Import stock (CSV)" -->
  <!--   "Import commandes (CSV)" -->
  <!--   "Import images" -->
</template>
```

### `src/views/backoffice/ImportOneShot.vue`
```vue
<script setup>
import { runImportOneShot } from '@/services/import/importServiceOneShot'

async function onFolderSelected(event)
  // Appelle runImportOneShot({ files })
</script>

<template>
  <!-- Sélection dossier complet: -->
  <!--   ✓ produit.csv -->
  <!--   ✓ stock.csv -->
  <!--   ✓ commande.csv -->
  <!--   ✓ images/ -->
</template>
```

### `src/views/backoffice/BackOfficeOrdersView.vue`
```vue
<script setup>
import { listGestionCommandes } from '@/services/dto/GestionCommandeDto'

async function loadOrders()
  // Appelle listGestionCommandes()
  // Affiche tableau avec orders
</script>

<template>
  <!-- Tableau: -->
  <!--   ID | Date | Client | Total | État -->
  <!-- Click ligne → OrderDetail modal -->
</template>
```

### `src/components/backoffice/OrderDetail.vue`
```vue
<!-- Modal affichage détail commande -->
<!-- Affiche: client, adresse, items, état -->
```

### `src/router/index.js`
```javascript
const routes = [
  { path: '/backoffice/import', component: DataImportView },
  { path: '/backoffice/import-oneshot', component: ImportOneShot },
  { path: '/backoffice/orders', component: BackOfficeOrdersView }
]
```

---

## Templates & Constants

### `src/services/order/achatCommande.js`
```javascript
export const achatCommandeTemplate = {
  client: {
    nom: '',
    email: '',
    pwd: '',
    adresse: ''
  },
  achats: [
    {
      reference: '',
      quantite: 1,
      karazany: ''
    }
  ],
  etat: 'en attente paiement a la livraison'
}
```

### `src/services/constants.js`
```javascript
export const DEFAULT_LANG_ID = 1
export const DEFAULT_CATEGORY_ID = 2
export const ...
```

### `src/services/utils/stringUtils.js`
```javascript
export function toInt(value, fallback)
  // String → Integer

export function toFloat(value, fallback)
  // String → Float

export function slugify(text)
  // "Jean Dupont" → "jean-dupont"

export function normalizeHeader(header)
  // "nom_client" → "nom_client"
```

---

## Résumé Quick Reference

### Charger un CSV
```javascript
const parsed = await parseCsvFile(file)
const rows = parsed.rows
```

### Importer les commandes
```javascript
const result = await runImport({ target: 'orders', rows })
```

### Créer une commande manuellement
```javascript
const config = buildOrderConfig()
const orderId = await createOrderFromCsvRow(csvRow, config)
```

### Récupérer toutes les commandes
```javascript
const allOrders = await listGestionCommandes()
```

### Créer ordre directement via API
```javascript
const orderId = await createOrder({
  id_customer: 5,
  id_cart: 8,
  total_paid: 150.00,
  ...
})
```

---

**Fichier généré automatiquement**  
**Dernière mise à jour**: 2024
