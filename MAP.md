# 🗺️ CARTE VISUELLE - Fichiers & Connexions

## 📦 Structure Arborescente Complète avec Connections

```
new-app2.0/
│
├─ 📋 ENTRÉE: data/commande.csv  ◄───────────┐
│                                             │
├─ .env ──────────────────────────┐          │
│  (Config métier)                 │          │
│                                  │          │
├─ src/                            │          │
│  │                               │          │
│  ├─ 📄 main.js (Point d'entrée) │          │
│  │                               │          │
│  ├─ 📄 router/                   │          │
│  │   └─ 📋 index.js              │          │
│  │      Routes:                  │          │
│  │      /backoffice/import ─┐    │          │
│  │      /backoffice/import-oneshot ┤    │
│  │      /backoffice/orders  ┘    │          │
│  │                               │          │
│  ├─ 🖥️ views/backoffice/        │          │
│  │   │                            │          │
│  │   ├─ 📱 DataImportView.vue    │          │
│  │   │   └─ Appelle:            │◄─────────┘
│  │   │     parseCsvFile()        │
│  │   │     runImport()           │
│  │   │                            │
│  │   ├─ 📱 ImportOneShot.vue     │
│  │   │   └─ Appelle:            │
│  │   │     runImportOneShot()    │
│  │   │                            │
│  │   ├─ 📱 BackOfficeOrdersView.vue
│  │   │   └─ Appelle:            │
│  │   │     listGestionCommandes()│
│  │   │                            │
│  │   └─ OrderDetail.vue          │
│  │                               │
│  ├─ 🔗 services/                 │
│  │   │                            │
│  │   ├─ 📂 import/               │
│  │   │   ├─ 🔍 csvParser.js      │
│  │   │   │   ┌─ parseCsvFile()  │
│  │   │   │   └─ parseCsvText()  │
│  │   │   │                        │
│  │   │   ├─ 🎛️ importService.js  │
│  │   │   │   ┌─ runImport()     │
│  │   │   │   ├─ importOrders() ──────┐
│  │   │   │   └─ importProducts() ...  │
│  │   │   │                            │
│  │   │   └─ 📦 importServiceOneShot.js
│  │   │       └─ runImportOneShot()   │
│  │   │          ┌─ produit.csv       │
│  │   │          ├─ stock.csv         │
│  │   │          ├─ commande.csv      │
│  │   │          └─ images/           │
│  │   │                               │
│  │   ├─ 📂 order/                    │
│  │   │   ├─ ⭐ commandeAchatService.js
│  │   │   │   ┌─ createOrderFromCsvRow() ◄────────┐
│  │   │   │   ├─ buildOrderConfig()      │        │
│  │   │   │   ├─ validateOrderConfig()   │        │
│  │   │   │   └─ parseOrderItems()       │        │
│  │   │   │                              │        │
│  │   │   └─ achatCommande.js            │        │
│  │   │       └─ achatCommandeTemplate   │        │
│  │   │                                  │        │
│  │   ├─ 📂 dto/                         │        │
│  │   │   └─ 📊 GestionCommandeDto.js    │        │
│  │   │       ┌─ listGestionCommandes() │        │
│  │   │       ├─ buildGestionCommandeDto()       │
│  │   │       ├─ fetchOrderFull()       │        │
│  │   │       ├─ fetchCustomerFull()    │        │
│  │   │       ├─ fetchOrderRows()       │        │
│  │   │       └─ formatStateLabel()     │        │
│  │   │                                  │        │
│  │   ├─ 📂 entities/ (CRUD Services)    │        │
│  │   │   ├─ 🏗️ crud.js                 │        │
│  │   │   │   └─ createCrud(resource)   │        │
│  │   │   │                              │        │
│  │   │   ├─ 🛒 ordersService.js        │◄─┐────┘
│  │   │   │   └─ createOrder() ──────────────┘
│  │   │   │                                     │
│  │   │   ├─ 👤 customersService.js           │
│  │   │   │   ├─ createCustomer() ────────────┘
│  │   │   │   └─ findCustomerIdByEmail()
│  │   │   │
│  │   │   ├─ 🏠 addressesService.js
│  │   │   │   └─ createAddress()
│  │   │   │
│  │   │   ├─ 🛒 cartsService.js
│  │   │   │   └─ createCart()
│  │   │   │
│  │   │   ├─ 📦 productsService.js
│  │   │   │   ├─ findProductInfoByReference()
│  │   │   │   └─ findProductIdByReference()
│  │   │   │
│  │   │   ├─ 🎨 combinationsService.js
│  │   │   │   └─ findCombinationByProductAndValueId()
│  │   │   │
│  │   │   ├─ 🏷️ productOptionValuesService.js
│  │   │   │   └─ findProductOptionValueIdByName()
│  │   │   │
│  │   │   ├─ 📝 orderDetailsService.js
│  │   │   │   └─ createOrderDetail()
│  │   │   │
│  │   │   ├─ 📋 orderHistoriesService.js
│  │   │   │   └─ createOrderHistory()
│  │   │   │
│  │   │   └─ 🔧 entityUtils.js
│  │   │       └─ fetchAllIds()
│  │   │
│  │   ├─ 📂 http/
│  │   │   └─ 🌐 prestashopClient.js
│  │   │       ├─ getXml()         ──┐
│  │   │       ├─ postXml()        ──┤──► API Calls
│  │   │       ├─ putXml()         ──┤
│  │   │       └─ deleteXml()      ──┘
│  │   │
│  │   ├─ 📂 xml/
│  │   │   └─ 📝 xmlUtils.js
│  │   │       ├─ parseXml()
│  │   │       ├─ xmlToJson()
│  │   │       ├─ buildEntityXml()
│  │   │       └─ getIdFromXml()
│  │   │
│  │   ├─ 📂 utils/
│  │   │   └─ 🔤 stringUtils.js
│  │   │       ├─ toInt()
│  │   │       ├─ toFloat()
│  │   │       └─ slugify()
│  │   │
│  │   ├─ 📋 constants.js
│  │   └─ 🔐 backofficeAuth.js
│  │
│  └─ 🎨 components/ (Vue Components)
│
└─ 📚 Documentation/
    ├─ FLUX_COMMANDES_DOCUMENTATION.md  (Détaillée)
    ├─ QUICK_REFERENCE.md               (Rapide)
    ├─ RESUME_EXECUTIF.md               (Vue d'ensemble)
    └─ MAP.md                           (Ce fichier)
```

---

## 🔄 FLUX DE DONNÉES - Détail du Chemin

```
┌──────────────────────────────────────────────────────────────────┐
│                    PHASE 1: CHARGER CSV                           │
└──────────────────────────────────────────────────────────────────┘

commande.csv
    ↓
[DataImportView.vue]
  onCsvSelected(event)
    ↓
    ↓─→ file = event.target.files[0]
    ↓
    ↓─→ await parseCsvFile(file)
    │       ▼
    │       [csvParser.js]
    │       parseCsvFile()
    │         ├─ readFile()
    │         ├─ detectDelimiter()
    │         ├─ parseHeader()
    │         ├─ buildNormalizedHeaders()
    │         └─ parseLine() pour chaque row
    │
    └─→ rows.value = parsed.rows


┌──────────────────────────────────────────────────────────────────┐
│                    PHASE 2: IMPORTER ROWS                         │
└──────────────────────────────────────────────────────────────────┘

[DataImportView.vue]
  startImport('orders')
    ↓
    └─→ await runImport({ target: 'orders', rows })
            ↓
            [importService.js]
            runImport()
              ├─ if target === 'orders'
              │   ↓
              │   └─ return importOrders(rows)
              │       ↓
              │       [importService.js]
              │       importOrders()
              │         │
              │         ├─ const config = buildOrderConfig()
              │         │   ↓
              │         │   [commandeAchatService.js]
              │         │   buildOrderConfig()
              │         │     └─ .env variables
              │         │
              │         ├─ validateOrderConfig(config)
              │         │   ↓
              │         │   [commandeAchatService.js]
              │         │   validateOrderConfig()
              │         │     └─ Check required config
              │         │
              │         └─ for each row:
              │             ↓
              │             └─ await createOrderFromCsvRow(row, config)


┌──────────────────────────────────────────────────────────────────┐
│              PHASE 3: CRÉER COMMANDE DEPUIS ROW                  │
└──────────────────────────────────────────────────────────────────┘

[commandeAchatService.js]
createOrderFromCsvRow(row, config)
  │
  ├─ STEP 1: Parse Items
  │   ↓
  │   parseOrderItems(row.achat)
  │   [("PRD001"; 2; "Taille M")] → Array<Item>
  │
  ├─ STEP 2: Get/Create Customer
  │   ↓
  │   ensureCustomer(row, config)
  │     ├─ findCustomerIdByEmail(email)
  │     │   ↓
  │     │   [customersService.js]
  │     │   findCustomerIdByEmail()
  │     │     ↓
  │     │     await getXml('customers?filter[email]={email}')
  │     │       ↓
  │     │       [prestashopClient.js]
  │     │       getXml()
  │     │         ├─ buildUrl()
  │     │         ├─ fetch GET
  │     │         └─ return XML
  │     │
  │     └─ OR createCustomer(data)
  │         ↓
  │         [customersService.js]
  │         createCustomer()
  │           ↓
  │           await postXml('customers', xmlBody)
  │             ↓
  │             [prestashopClient.js]
  │             postXml()
  │               ├─ buildEntityXml('customer', data)
  │               │   ↓
  │               │   [xmlUtils.js]
  │               │   buildEntityXml()
  │               │
  │               ├─ fetch POST
  │               └─ getIdFromXml(response, 'customer')
  │
  ├─ STEP 3: Create Address
  │   ↓
  │   createAddressForCustomer(customerId, row, config)
  │     ↓
  │     [addressesService.js]
  │     createAddress()
  │       ↓
  │       await postXml('addresses', xmlBody)
  │
  ├─ STEP 4: Resolve Items
  │   ↓
  │   resolveOrderItems(orderItems)
  │     for each item:
  │       ├─ findProductInfoByReference(reference)
  │       │   ↓
  │       │   [productsService.js]
  │       │   findProductInfoByReference()
  │       │     ↓
  │       │     await getXml('products?filter[reference]={ref}')
  │       │
  │       └─ if karazany:
  │           ├─ findProductOptionValueIdByName(karazany)
  │           │   ↓
  │           │   [productOptionValuesService.js]
  │           │
  │           └─ findCombinationByProductAndValueId(pid, vid)
  │               ↓
  │               [combinationsService.js]
  │
  ├─ STEP 5: Create Cart
  │   ↓
  │   createCartForOrder(customerId, addressId, items, config)
  │     ↓
  │     [cartsService.js]
  │     createCart()
  │       ↓
  │       await postXml('carts', xmlBody)
  │
  ├─ STEP 6: Compute Totals
  │   ↓
  │   computeOrderTotals(items)
  │     └─ return { totalPaid, totalProducts, ... }
  │
  ├─ STEP 7: Create Order
  │   ↓
  │   createOrder(orderData)
  │     ↓
  │     [ordersService.js]
  │     createOrder()
  │       ↓
  │       await postXml('orders', xmlBody)
  │         └─ API: POST /api/orders → orderId
  │
  ├─ STEP 8: Create Order Details
  │   ↓
  │   for each item:
  │     ↓
  │     createOrderDetail(detailData)
  │       ↓
  │       [orderDetailsService.js]
  │       createOrderDetail()
  │         ↓
  │         await postXml('order_details', xmlBody)
  │           └─ API: POST /api/order_details
  │
  └─ STEP 9: Create History
      ↓
      createOrderHistory(historyData)
        ↓
        [orderHistoriesService.js]
        createOrderHistory()
          ↓
          await postXml('order_histories', xmlBody)
            └─ API: POST /api/order_histories


┌──────────────────────────────────────────────────────────────────┐
│              PHASE 4: AFFICHER COMMANDES                         │
└──────────────────────────────────────────────────────────────────┘

[BackOfficeOrdersView.vue]
  onMounted()
    ↓
    loadOrders()
      ↓
      await listGestionCommandes()
        ↓
        [GestionCommandeDto.js]
        listGestionCommandes()
          │
          ├─ const ids = await listOrderIds()
          │   ↓
          │   [ordersService.js]
          │   listOrderIds()
          │     ↓
          │     await getXml('orders')
          │       └─ API: GET /api/orders
          │
          └─ for each id:
              ↓
              await buildGestionCommandeDto(id)
                │
                ├─ const order = await fetchOrderFull(id)
                │   ├─ await getXml('orders/{id}?display=full')
                │   │   └─ API: GET /api/orders/{id}?display=full
                │   └─ xmlToJson(xml)
                │
                ├─ const customer = await fetchCustomerFull(customerId)
                │   ├─ await getXml('customers/{id}?display=full')
                │   │   └─ API: GET /api/customers/{id}?display=full
                │   └─ xmlToJson(xml)
                │
                ├─ const addressDelivery = await fetchAddressFull(addressId)
                │   └─ API: GET /api/addresses/{id}?display=full
                │
                ├─ const rows = await fetchOrderRows(order)
                │   ├─ parse order.associations.order_rows
                │   ├─ for each: fetchFirstProductImageUrl()
                │   │   └─ API: GET /api/images/products/{id}
                │   └─ normalizeOrderRow()
                │
                └─ return {
                    order, customer, cart, addressDelivery,
                    rows,
                    summary: {
                      id, date, customerName,
                      totalPaid, currentStateId, currentStateLabel
                    }
                  }

  orders.value = await listGestionCommandes()
    ↓
    [Vue Rendering]
    ↓
  <table class="orders">
    <tr v-for="entry in orders">
      <td>{{ entry.summary.id }}</td>
      <td>{{ entry.summary.date }}</td>
      <td>{{ entry.summary.customerName }}</td>
      <td>{{ entry.summary.totalPaid }}</td>
      <td>{{ entry.summary.currentStateLabel }}</td>
    </tr>
  </table>
```

---

## 🔗 CONNEXIONS ENTRE SERVICES

### Dépendances Import

```
csvParser.js
  ├─ parseCsvFile() [PUBLIC]
  └─ parseCsvText() [PUBLIC]
       ↑
       │
   importService.js
       │
       ├─ runImport() [PUBLIC]
       │   ├─ imports → csvParser
       │   ├─ imports → commandeAchatService
       │   └─ imports → 9 entity services
       │
       └─ importOrders()
           └─ calls → createOrderFromCsvRow()
                       ↓
                    commandeAchatService.js
                       ├─ parseOrderItems()
                       ├─ ensureCustomer()
                       ├─ createAddressForCustomer()
                       ├─ resolveOrderItems()
                       └─ createCartForOrder()
```

### Dépendances Display

```
GestionCommandeDto.js
  ├─ listGestionCommandes() [PUBLIC]
  │   └─ calls → buildGestionCommandeDto()
  │       ├─ fetchOrderFull()
  │       ├─ fetchCustomerFull()
  │       ├─ fetchCartFull()
  │       ├─ fetchAddressFull()
  │       ├─ fetchOrderRows()
  │       └─ fetchFirstProductImageUrl()
  │
  └─ All fetch functions
      └─ calls → prestashopClient.{getXml, postXml}
                  └─ calls → xmlUtils.{parseXml, xmlToJson}
```

### Dépendances HTTP

```
prestashopClient.js [Core]
  ├─ getXml()     ← Utilisé par ordersService, customersService, etc.
  ├─ postXml()    ← Utilisé par TOUS les entity services
  ├─ putXml()
  └─ deleteXml()
       ↑
       │ imports
       │
   All entity services
       ordersService.js
       customersService.js
       addressesService.js
       cartsService.js
       productsService.js
       combinationsService.js
       etc.
```

---

## 📡 APPELS API - Mapping Complet

```
Service → Function → Endpoint

ordersService.js
  ├─ listOrderIds() → GET /api/orders
  ├─ readOrder() → GET /api/orders/{id}
  ├─ createOrder() → POST /api/orders
  ├─ updateOrder() → PUT /api/orders/{id}
  └─ deleteOrder() → DELETE /api/orders/{id}

customersService.js
  ├─ findCustomerIdByEmail() → GET /api/customers?filter[email]={email}
  ├─ createCustomer() → POST /api/customers
  └─ ... (autres CRUD)

addressesService.js
  ├─ createAddress() → POST /api/addresses
  └─ ... (autres CRUD)

productsService.js
  ├─ findProductInfoByReference() → GET /api/products?filter[reference]={ref}
  └─ ... (autres CRUD)

combinationsService.js
  ├─ findCombinationByProductAndValueId() → GET /api/combinations?filter[id_product]={id}
  └─ ... (autres CRUD)

orderDetailsService.js
  ├─ createOrderDetail() → POST /api/order_details
  └─ ... (autres CRUD)

orderHistoriesService.js
  ├─ createOrderHistory() → POST /api/order_histories
  └─ ... (autres CRUD)
```

---

## 🎯 FICHIERS CLÉS À CONNAÎTRE

### ⭐ ABSOLUMENT ESSENTIELS

1. **[commandeAchatService.js](src/services/order/commandeAchatService.js)**
   - Cœur du système
   - `createOrderFromCsvRow()` - 9 étapes
   - `buildOrderConfig()` - Config

2. **[importService.js](src/services/import/importService.js)**
   - Orchestration
   - `importOrders()` - Boucle rows
   - Appelle commandeAchatService

3. **[csvParser.js](src/services/import/csvParser.js)**
   - Charge et parse CSV
   - `parseCsvFile()` - Détecte délimiteur

4. **[GestionCommandeDto.js](src/services/dto/GestionCommandeDto.js)**
   - Lecture complète
   - `listGestionCommandes()` - Toutes les commandes

### 🔧 TRÈS IMPORTANTS

5. **[prestashopClient.js](src/services/http/prestashopClient.js)**
   - HTTP client
   - Authentification API

6. **[.env](.env)**
   - Configuration métier
   - Clés API

### 📱 FRONTEND

7. **[DataImportView.vue](src/views/backoffice/DataImportView.vue)**
8. **[ImportOneShot.vue](src/views/backoffice/ImportOneShot.vue)**
9. **[BackOfficeOrdersView.vue](src/views/backoffice/BackOfficeOrdersView.vue)**

---

## 📊 STATISTIQUES

| Catégorie | Compte |
|-----------|--------|
| Services d'Import | 3 |
| Services Order | 2 |
| Services Entities (CRUD) | 9+ |
| Services HTTP | 2 |
| Services Utils | 2 |
| Vues Frontend | 3+ |
| Endpoints API | 30+ |
| Variables Config (.env) | 20+ |
| Fonctions Principales | 15+ |
| **Fichiers Totaux** | **50+** |

---

**Carte complète ✓**  
**Toutes les connexions visualisées ✓**  
**Prêt à développer ✓**
