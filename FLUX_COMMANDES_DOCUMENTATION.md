# Documentation Complète : Flux de Gestion des Commandes (commande.csv)

## 📋 Vue d'ensemble

Ce projet PrestaShop intègre un système d'import et de gestion des commandes via fichiers CSV. Le flux traite les données depuis `commande.csv` jusqu'à l'affichage des commandes dans le backoffice.

**Fichier Source**: `data/commande.csv`  
**API Utilisée**: RESTful API PrestaShop (XML)  
**Configuration**: `.env`

---

## 🔍 Phase 1 : Localisation du Code CSV

### 📂 Fichiers d'Import

| Chemin | Description |
|--------|------------|
| `src/services/import/csvParser.js` | Parser générique CSV (détecte délimiteur, normalise headers) |
| `src/services/import/importService.js` | Orchestration import (routing par type: products, stocks, orders) |
| `src/services/import/importServiceOneShot.js` | Import complet (produit.csv + stock.csv + commande.csv + images) |

### 🎯 Fonction CSV pour Commandes

**Fichier**: [src/services/import/csvParser.js](src/services/import/csvParser.js)

```javascript
export async function parseCsvFile(file, options = {})
```

- Charge le fichier CSV
- Détecte le délimiteur (`;`, `,`, `\t`)
- Normalise les en-têtes de colonnes
- Retourne: `{ delimiter, headers, normalizedHeaders, rows }`

**Exemple**:
```javascript
const parsed = await parseCsvFile(file)
// Résultat:
{
  delimiter: ';',
  headers: ['email', 'nom', 'pwd', 'adresse', 'achat', 'etat'],
  normalizedHeaders: ['email', 'nom', 'pwd', 'adresse', 'achat', 'etat'],
  rows: [
    { email: 'client@ex.com', nom: 'Jean Dupont', ... },
    ...
  ]
}
```

---

## 🎛️ Phase 2 : Routes Frontend (Points d'Entrée)

### Vue Router Configuration

**Fichier**: [src/router/index.js](src/router/index.js)

| Route | Vue Component | Fonction |
|-------|---------------|----------|
| `/backoffice/import` | `DataImportView.vue` | Import fichier unique (CSV) |
| `/backoffice/import-oneshot` | `ImportOneShot.vue` | Import complet (tous CSV + images) |
| `/backoffice/orders` | `BackOfficeOrdersView.vue` | Affichage liste des commandes |

### 📱 Vue : Import Unique (DataImportView.vue)

**Fichier**: [src/views/backoffice/DataImportView.vue](src/views/backoffice/DataImportView.vue)

```vue
<script setup>
import { parseCsvFile } from '@/services/import/csvParser'
import { runImport } from '@/services/import/importService'

async function onCsvSelected(event) {
  const file = event.target.files[0]
  const parsed = await parseCsvFile(file)
  rows.value = parsed.rows
}

async function startImport(target) {
  // target = 'products' | 'stocks' | 'orders'
  const result = await runImport({ target, rows: rows.value })
}
</script>
```

**Workflow**:
1. Utilisateur sélectionne fichier CSV
2. Clique "Import commandes (CSV)"
3. Appelle `runImport({ target: 'orders', rows })`

### 📦 Vue : Import Complet One-Shot (ImportOneShot.vue)

**Fichier**: [src/views/backoffice/ImportOneShot.vue](src/views/backoffice/ImportOneShot.vue)

```javascript
import { runImportOneShot } from '@/services/import/importServiceOneShot'

async function handleFolderSelect(files) {
  const result = await runImportOneShot({ files })
  // Retourne: { products, stocks, orders, images }
}
```

**Attendus**:
```
Dossier/
  ├── produit.csv
  ├── stock.csv
  ├── commande.csv
  └── images/
      ├── PRD001.jpg
      └── PRD002.png
```

### 📊 Vue : Affichage Commandes (BackOfficeOrdersView.vue)

**Fichier**: [src/views/backoffice/BackOfficeOrdersView.vue](src/views/backoffice/BackOfficeOrdersView.vue)

```javascript
import { listGestionCommandes } from '@/services/dto/GestionCommandeDto'

async function loadOrders() {
  orders.value = await listGestionCommandes()
}

// Affiche tableau:
// | ID | Date | Client | Total | État |
```

---

## 🔄 Phase 3 : Appel du Service commandeAchatService

### Fichier Principal

**Fichier**: [src/services/import/importService.js](src/services/import/importService.js)

```javascript
async function importOrders(rows) {
  const config = buildOrderConfig()
  validateOrderConfig(config)

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    try {
      await createOrderFromCsvRow(row, config)
      success += 1
    } catch (error) {
      console.log(`Row ${index + 1}: ${error.message}`)
    }
  }

  return { total: rows.length, success }
}
```

### Service de Création de Commande

**Fichier**: [src/services/order/commandeAchatService.js](src/services/order/commandeAchatService.js)

**Fonction Principale**:
```javascript
export async function createOrderFromCsvRow(row, config)
```

**Signature de `row`** (CSV):
```javascript
{
  email: 'client@example.com',
  nom: 'Jean Dupont',
  pwd: 'password123',
  adresse: '123 Rue Principal',
  achat: '[("PRD001"; 2; "Taille M") ("PRD002"; 1; "")]',
  etat: 'en attente'
}
```

---

## 🏗️ Phase 4 : Architecture Détaillée de Création Commande

### Étape 1 : Parse des Items

```javascript
parseOrderItems(row.achat)
// Parse format: [("reference"; quantity; "karazany")]
// Retourne: Array<{ reference, quantity, karazany }>

// Exemple:
// Input:  '[("PRD001"; 2; "Taille M") ("PRD002"; 1; "")]'
// Output: [
//   { reference: 'PRD001', quantity: 2, karazany: 'Taille M' },
//   { reference: 'PRD002', quantity: 1, karazany: '' }
// ]
```

### Étape 2 : Gestion Client

```javascript
const email = row.email?.trim()
const existingId = await findCustomerIdByEmail(email)  // API GET

if (existingId) {
  // Client existe
  customerId = existingId
} else {
  // Création client
  customerId = await createCustomer({
    id_lang: config.langId,
    id_shop: config.shopId,
    firstname, lastname, email,
    passwd: row.pwd,
    active: 1
  })  // API POST /customers
}
```

### Étape 3 : Création Adresse

```javascript
const addressId = await createAddress({
  id_customer: customerId,
  id_country: config.countryId,
  firstname, lastname,
  address1: row.adresse,
  city: config.defaultCity,
  postcode: config.defaultPostcode,
  phone: '0000000000'
})  // API POST /addresses
```

### Étape 4 : Résolution des Produits

```javascript
for each item in parseOrderItems(row.achat):
  const productInfo = await findProductInfoByReference(item.reference)
  
  if item.karazany:
    const valueId = await findProductOptionValueIdByName(item.karazany)
    const combinationId = await findCombinationByProductAndValueId(
      productInfo.id, valueId
    )
    resolvedItem.productAttributeId = combinationId
  else:
    resolvedItem.productAttributeId = 0

  resolvedItem.id = productInfo.id
  resolvedItem.name = productInfo.name
  resolvedItem.price = productInfo.price
  resolvedItem.quantity = item.quantity
```

### Étape 5 : Création Panier

```javascript
const cartId = await createCart({
  id_customer: customerId,
  id_address_delivery: addressId,
  id_address_invoice: addressId,
  id_shop: config.shopId,
  id_lang: config.langId
})  // API POST /carts

// Items déjà dans cart via associées
```

### Étape 6 : Calcul des Totaux

```javascript
const totals = computeOrderTotals(resolvedItems)
// Retourne:
{
  totalProducts: sum(item.price * item.quantity),
  totalPaid: totalProducts,
  totalDiscounts: 0,
  totalShipping: 0,
  totalWrapping: 0
}
```

### Étape 7 : Création Commande

```javascript
const orderId = await createOrder({
  id_cart: cartId,
  id_currency: config.currencyId,
  id_lang: config.langId,
  id_customer: customerId,
  id_address_delivery: addressId,
  id_address_invoice: addressId,
  id_carrier: config.carrierId,
  id_shop: config.shopId,
  current_state: resolveOrderStateId(row.etat, config),
  payment: 'Paiement a la livraison',
  module: config.cashModule,
  total_paid: totals.totalPaid,
  total_products: totals.totalProducts,
  secure_key: secureKey,
  conversion_rate: 1
})  // API POST /orders
```

### Étape 8 : Détails de Commande

```javascript
for each resolvedItem:
  await createOrderDetail({
    id_order: orderId,
    product_id: item.id,
    product_attribute_id: item.productAttributeId,
    product_name: item.name,
    product_reference: item.reference,
    product_quantity: item.quantity,
    product_price: item.price,
    unit_price_tax_incl: item.price,
    total_price_tax_incl: item.price * item.quantity,
    id_warehouse: config.warehouseId,
    id_shop: config.shopId
  })  // API POST /order_details
```

### Étape 9 : Historique Commande

```javascript
await createOrderHistory({
  id_order: orderId,
  id_order_state: orderStateId
})  // API POST /order_histories
```

---

## ⚙️ Phase 5 : Configuration (.env)

**Fichier**: [.env](.env)

```env
# API PrestaShop
VITE_PS_API_BASE_URL=/prestashop/api
VITE_PS_API_KEY=rnXhBF5axIxmpIeCKMvEH0BS8GSrhX1V

# Backoffice Auth
VITE_BACKOFFICE_LOGIN=admin
VITE_BACKOFFICE_PASSWORD=admin

# Valeurs par Défaut Commande
VITE_DEFAULT_LANG_ID=1
VITE_DEFAULT_SHOP_ID=1
VITE_DEFAULT_SHOP_GROUP_ID=1
VITE_DEFAULT_CURRENCY_ID=1
VITE_DEFAULT_COUNTRY_ID=8
VITE_DEFAULT_STATE_ID=0
VITE_DEFAULT_CUSTOMER_GROUP_ID=3
VITE_DEFAULT_CARRIER_ID=1
VITE_DEFAULT_WAREHOUSE_ID=1

# Adresse Par Défaut
VITE_DEFAULT_CITY=Antananarivo
VITE_DEFAULT_POSTCODE=101

# Module de Paiement
VITE_CASH_MODULE=ps_cashondelivery

# États Commande (IDs)
VITE_ORDER_STATE_PENDING_ID=10      # En attente
VITE_ORDER_STATE_PAID_ID=2          # Acceptée
VITE_ORDER_STATE_ERROR_ID=8         # Échec
```

**Validation**: [src/services/order/commandeAchatService.js](src/services/order/commandeAchatService.js#buildOrderConfig)

```javascript
export function buildOrderConfig() {
  return {
    langId: toInt(import.meta.env.VITE_DEFAULT_LANG_ID || 1, 1),
    shopId: toInt(import.meta.env.VITE_DEFAULT_SHOP_ID || '1', 1),
    // ... autres config
  }
}

export function validateOrderConfig(config) {
  if (!config.currencyId) throw new Error('Missing VITE_DEFAULT_CURRENCY_ID')
  if (!config.langId) throw new Error('Missing VITE_DEFAULT_LANG_ID')
  if (!config.shopId) throw new Error('Missing VITE_DEFAULT_SHOP_ID')
  // ... autres validations
}
```

---

## 🔌 Phase 6 : HTTP Client & Endpoints API

### Client HTTP

**Fichier**: [src/services/http/prestashopClient.js](src/services/http/prestashopClient.js)

```javascript
export async function getXml(path, query)      // GET
export async function postXml(resource, xml)   // POST (CREATE)
export async function putXml(path, xml)        // PUT (UPDATE)
export async function deleteXml(path, ...)     // DELETE
```

**URL Construction**:
```javascript
const baseUrl = import.meta.env.VITE_PS_API_BASE_URL  // /prestashop/api
const apiKey = import.meta.env.VITE_PS_API_KEY

// Exemple: GET /api/orders/123?ws_key=KEY
// Devient: GET /prestashop/api/orders/123?ws_key=rnXhBF5axIxmpIeCKMvEH0BS8GSrhX1V
```

### Endpoints Utilisés

**Lecture (GET)**:
```
GET /api/orders
GET /api/orders/{id}?display=full
GET /api/customers/{id}?display=full
GET /api/carts/{id}?display=full
GET /api/addresses/{id}?display=full
GET /api/products?filter[reference]={ref}
GET /api/product_options
GET /api/product_option_values
GET /api/combinations
GET /api/images/products/{id}
```

**Création (POST)**:
```
POST /api/customers
POST /api/addresses
POST /api/carts
POST /api/orders
POST /api/order_details
POST /api/order_histories
```

**Mise à Jour (PUT)**:
```
PUT /api/orders/{id}
```

---

## 📡 Phase 7 : Récupération & Affichage Commandes

### Service DTO (Data Transfer Object)

**Fichier**: [src/services/dto/GestionCommandeDto.js](src/services/dto/GestionCommandeDto.js)

**Fonction Principale**:
```javascript
export async function listGestionCommandes()
```

**Flow**:
```javascript
1. const ids = await listOrderIds()              // GET /api/orders
2. for each id:
   const dto = await buildGestionCommandeDto(id)
   
3. buildGestionCommandeDto(id):
   - GET /api/orders/{id}?display=full
   - GET /api/customers/{customerId}?display=full
   - GET /api/carts/{cartId}?display=full
   - GET /api/addresses/{addressId}?display=full
   - Parse order.associations.order_rows
   - Fetch product images
   - Format: state, customer name, totals

4. Return: Array<GestionCommandeDto>
```

**Structure DTO Retournée**:
```javascript
{
  order,              // Full order data from API
  customer,           // Full customer data from API
  cart,              // Full cart data from API
  addressDelivery,   // Delivery address
  addressInvoice,    // Invoice address
  rows,              // Array of order line items
  
  summary: {
    id,              // Order ID
    date,            // Order date
    customerName,    // "FirstName LastName (email)"
    totalPaid,       // Formatted price "123.45"
    currentStateId,  // State ID
    currentStateLabel // "acceptee" | "echec" | "en attente"
  }
}
```

### Affichage dans le Backoffice

**Fichier**: [src/views/backoffice/BackOfficeOrdersView.vue](src/views/backoffice/BackOfficeOrdersView.vue)

```vue
<script setup>
import { listGestionCommandes } from '@/services/dto/GestionCommandeDto'

async function loadOrders() {
  orders.value = await listGestionCommandes()
}
</script>

<template>
  <table class="orders">
    <tr v-for="entry in orders">
      <td>{{ entry.summary.id }}</td>
      <td>{{ entry.summary.date }}</td>
      <td>{{ entry.summary.customerName }}</td>
      <td>{{ entry.summary.totalPaid }}</td>
      <td :class="stateClass(entry.summary.currentStateLabel)">
        {{ entry.summary.currentStateLabel }}
      </td>
    </tr>
  </table>
</template>
```

---

## 📂 Arborescence Complète des Fichiers Impliqués

```
new-app2.0/
├── .env                                    # Configuration
├── data/
│   ├── commande.csv                       # ✅ Source CSV
│   ├── produit.csv
│   └── stock.csv
│
├── src/
│   ├── main.js                            # Entry point
│   ├── App.vue                            # Root component
│   │
│   ├── router/
│   │   └── index.js                       # Routes
│   │
│   ├── views/backoffice/
│   │   ├── DataImportView.vue             # ✅ Import CSV unique
│   │   ├── ImportOneShot.vue              # ✅ Import complet
│   │   ├── BackOfficeOrdersView.vue       # ✅ Affichage commandes
│   │   └── ...
│   │
│   ├── components/backoffice/
│   │   ├── OrderDetail.vue                # Modal détail commande
│   │   └── ...
│   │
│   └── services/
│       ├── import/
│       │   ├── csvParser.js               # ✅ Parse CSV
│       │   ├── importService.js           # ✅ Orchestration import
│       │   └── importServiceOneShot.js    # ✅ Import complet
│       │
│       ├── order/
│       │   ├── commandeAchatService.js    # ✅ Création commande
│       │   └── achatCommande.js           # Template DTO
│       │
│       ├── dto/
│       │   └── GestionCommandeDto.js      # ✅ DTO & lecture commandes
│       │
│       ├── entities/
│       │   ├── crud.js                    # Pattern CRUD générique
│       │   ├── ordersService.js           # CRUD Orders
│       │   ├── orderDetailsService.js     # CRUD Order Details
│       │   ├── orderHistoriesService.js   # CRUD Order History
│       │   ├── customersService.js        # CRUD Customers
│       │   ├── addressesService.js        # CRUD Addresses
│       │   ├── cartsService.js            # CRUD Carts
│       │   ├── productsService.js         # CRUD Products
│       │   ├── combinationsService.js     # CRUD Combinations
│       │   ├── productOptionValuesService.js
│       │   └── ...
│       │
│       ├── http/
│       │   └── prestashopClient.js        # HTTP client (getXml, postXml, ...)
│       │
│       ├── xml/
│       │   └── xmlUtils.js                # Parse/sérialisation XML
│       │
│       ├── utils/
│       │   └── stringUtils.js             # Conversion types, normalisation
│       │
│       ├── constants.js                   # Constantes app
│       └── backofficeAuth.js              # Auth backoffice
│
├── public/
├── package.json
└── vite.config.js
```

---

## 🔍 Exemple Complet : Import Commande

### Données CSV

```csv
email;nom;pwd;adresse;achat;etat
john@example.com;Jean Dupont;pass123;123 Rue Principal;[("PRD001"; 2; "Taille M") ("PRD002"; 1; "")];en attente
```

### Flux Complet

```
1. USER: Sélectionne commande.csv → DataImportView.vue
        ↓
2. PARSE: parseCsvFile() → Row object:
   {
     email: 'john@example.com',
     nom: 'Jean Dupont',
     achat: '[("PRD001"; 2; "Taille M") ("PRD002"; 1; "")]',
     ...
   }
        ↓
3. IMPORT: runImport({ target: 'orders', rows: [row] })
        ↓
4. CREATE: createOrderFromCsvRow(row, config)
   
   a) Parse items:
      [
        { reference: 'PRD001', quantity: 2, karazany: 'Taille M' },
        { reference: 'PRD002', quantity: 1, karazany: '' }
      ]
   
   b) Get/Create customer:
      customerId = await findCustomerIdByEmail('john@example.com')
      OR customerId = await createCustomer(...)
      
   c) Create address:
      addressId = await createAddress(...)
      
   d) Resolve products:
      productInfo1 = await findProductInfoByReference('PRD001')
      combinationId1 = await findCombinationByProductAndValueId(
        productInfo1.id, 'Taille M'
      )
      
   e) Create cart:
      cartId = await createCart({ id_customer, id_address, ... })
      
   f) Create order:
      orderId = await createOrder({
        id_cart: cartId,
        id_customer: customerId,
        current_state: 10,  // en attente
        total_paid: 250.00,
        ...
      })
      
   g) Create order details:
      await createOrderDetail({ id_order: orderId, product_id: PRD001, ... })
      await createOrderDetail({ id_order: orderId, product_id: PRD002, ... })
      
   h) Create history:
      await createOrderHistory({ id_order: orderId, id_order_state: 10 })
        ↓
5. RESULT: Order created with ID = 42
        ↓
6. USER: Accède /backoffice/orders → BackOfficeOrdersView.vue
        ↓
7. DISPLAY: listGestionCommandes()
   - GET /api/orders → [42, 41, 40, ...]
   - buildGestionCommandeDto(42)
     - GET /api/orders/42?display=full
     - GET /api/customers/5?display=full
     - GET /api/addresses/12?display=full
     - GET /api/carts/8?display=full
     - Parse order_rows
   - Return GestionCommandeDto
        ↓
8. TABLE: Affiche ligne:
   | 42 | 2024-01-15 | Jean Dupont (john@example.com) | 250.00 | en attente |
```

---

## ✅ Checklist : Points Clés

- [x] **CSV Source**: `data/commande.csv`
- [x] **Parser**: `src/services/import/csvParser.js::parseCsvFile()`
- [x] **Importer**: `src/services/import/importService.js::importOrders()`
- [x] **Creator**: `src/services/order/commandeAchatService.js::createOrderFromCsvRow()`
- [x] **Entities**: Services CRUD pour chaque entité (ordersService, customersService, etc.)
- [x] **HTTP**: `src/services/http/prestashopClient.js`
- [x] **API Base**: `/prestashop/api` (défini dans `.env`)
- [x] **Frontend UI**: 3 vues principales (DataImportView, ImportOneShot, BackOfficeOrdersView)
- [x] **DTO Reader**: `src/services/dto/GestionCommandeDto.js::listGestionCommandes()`
- [x] **Configuration**: `.env` avec 20+ variables de config

---

## 🚨 Validation & Erreurs

### Required Config
```javascript
validateOrderConfig(config):
  - currencyId ✓
  - langId ✓
  - shopId ✓
  - shopGroupId ✓
  - carrierId ✓
  - warehouseId ✓
  - orderStatePendingId ✓
```

### CSV Row Validation
```javascript
createOrderFromCsvRow(row):
  - email (required) ✓
  - achat (non-empty) ✓
  - Valid product references ✓
  - Valid product attributes (karazany) ✓
```

### Exception Examples
- "Empty achat" → No order items parsed
- "Missing email" → No customer identifier
- "No valid products" → Product references not found
- "Missing secure_key" → Can't create order without customer secure key

---

## 📚 Services Impliqués

### Order Services
- `ordersService.js` - Create, read, update orders
- `orderDetailsService.js` - Order line items
- `orderHistoriesService.js` - Order state history
- `commandeAchatService.js` - CSV → Order conversion

### Entity Services
- `customersService.js` - Customer management
- `addressesService.js` - Address management
- `cartsService.js` - Cart management
- `productsService.js` - Product lookup
- `combinationsService.js` - Product variations
- `productOptionValuesService.js` - Product attributes

### HTTP Services
- `prestashopClient.js` - Low-level HTTP/XML
- `xmlUtils.js` - XML parsing/serialization

---

## 🔗 Relations Entités

```
Order
├── id_customer → Customer
├── id_cart → Cart
├── id_address_delivery → Address
├── id_address_invoice → Address
├── id_currency → Currency
├── id_shop → Shop
├── current_state → OrderState
└── associations.order_rows → OrderRow[]
    └── OrderRow
        ├── product_id → Product
        ├── product_attribute_id → Combination
        └── id_image → Image
```

---

**Documentation Créée**: 2024  
**Projet**: PrestaShop new-app2.0  
**Vue Framework**: Vue 3 + Vite  
**API**: PrestaShop RESTful (XML)
