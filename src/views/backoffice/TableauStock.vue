<script setup>
import { ref, onMounted } from 'vue'
import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { listProductVariants } from '@/services/frontoffice/productVariantsService'
import {
  getStockQuantityByProduct,
  getStockQuantityByProductAndAttribute
} from '@/services/entities/stockAvailablesService'
import { listGestionCommandes } from '@/services/dto/GestionCommandeDto'
import { buildOrderConfig } from '@/services/order/commandeAchatService'

const categories = ref([])
const rows = ref([])
const loading = ref(false)
const error = ref('')

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function pickLangText(node, selector) {
  return getText(node, `${selector} > language`) || getText(node, selector)
}

async function fetchCategories() {
  const xml = await getXml('categories', {
    display: '[id,name]',
    limit: '0,1000'
  })
  const doc = parseXml(xml)
  const nodes = Array.from(doc.querySelectorAll('category'))
  return nodes
    .map((node) => {
      const id = toInt(node.getAttribute('id') || getText(node, 'id'), 0)
      if (!id) {
        return null
      }
      const name = pickLangText(node, 'name') || `Categorie #${id}`
      return { id, name }
    })
    .filter(Boolean)
}

async function fetchProducts() {
  const xml = await getXml('products', {
    display: '[id,id_category_default]',
    limit: '0,1000'
  })
  const doc = parseXml(xml)
  const nodes = Array.from(doc.querySelectorAll('product'))
  return nodes
    .map((node) => {
      const id = toInt(node.getAttribute('id') || getText(node, 'id'), 0)
      if (!id) {
        return null
      }
      const categoryId = toInt(getText(node, 'id_category_default'), 0)
      return { id, categoryId }
    })
    .filter(Boolean)
}

async function computePhysicalStock(products = []) {
  const totals = new Map()

  await Promise.all(
    products.map(async (product) => {
      if (!product?.id || !product?.categoryId) {
        return null
      }

      const variants = await listProductVariants(product.id)
      let total = 0

      if (variants.length) {
        const quantities = await Promise.all(
          variants.map(async (variant) => {
            const qty = await getStockQuantityByProductAndAttribute(product.id, variant.id)
            return Number.isFinite(qty) ? qty : 0
          })
        )
        total = quantities.reduce((sum, value) => sum + value, 0)
      } else {
        const qty = await getStockQuantityByProduct(product.id)
        total = Number.isFinite(qty) ? qty : 0
      }

      const key = String(product.categoryId)
      totals.set(key, (totals.get(key) || 0) + total)
      return null
    })
  )

  return totals
}

async function computeReservedStock(productCategoryMap) {
  const config = buildOrderConfig()
  const paidId = toInt(config.orderStatePaidId, 0)
  const deliveredId = toInt(config.orderStateDeliveredId, 0)

  const entries = await listGestionCommandes()
  const totals = new Map()

  entries.forEach((entry) => {
    const summary = entry?.summary || {}
    if (summary.isCart) {
      return
    }
    const stateId = toInt(summary.currentStateId, 0)
    if (stateId !== paidId && stateId !== deliveredId) {
      return
    }
    const orderRows = Array.isArray(entry?.rows) ? entry.rows : []
    orderRows.forEach((row) => {
      const productId = toInt(row?.productId, 0)
      const quantity = toInt(row?.quantity, 0)
      if (!productId || !quantity) {
        return
      }
      const categoryId = productCategoryMap.get(String(productId))
      if (!categoryId) {
        return
      }
      const key = String(categoryId)
      totals.set(key, (totals.get(key) || 0) + quantity)
    })
  })

  return totals
}

async function loadTable() {
  loading.value = true
  error.value = ''
  try {
    const [categoryList, productList] = await Promise.all([
      fetchCategories(),
      fetchProducts()
    ])

    categories.value = categoryList
    const productCategoryMap = new Map(
      productList.map((product) => [String(product.id), product.categoryId])
    )

    const [physicalTotals, reservedTotals] = await Promise.all([
      computePhysicalStock(productList),
      computeReservedStock(productCategoryMap)
    ])

    rows.value = categoryList.map((category) => {
      const key = String(category.id)
      const physical = physicalTotals.get(key) || 0
      const reserved = reservedTotals.get(key) || 0
      return {
        id: category.id,
        name: category.name,
        physical,
        reserved,
        available: physical - reserved
      }
    })
  } catch (err) {
    error.value = err?.message || 'Erreur chargement tableau stock.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTable()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Backoffice</p>
        <h1>Tableau stock</h1>
        <p class="subtitle">Vue par categorie: physique, reserve, disponible.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="ghost" :disabled="loading" @click="loadTable">
          Actualiser
        </button>
      </div>
    </header>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-else-if="loading" class="notice">Chargement...</div>
    <div v-else-if="!rows.length" class="empty">Aucune categorie disponible.</div>

    <div v-else class="table-card">
      <table class="stock-table">
        <thead>
          <tr>
            <th>Categorie</th>
            <th>Qte physique</th>
            <th>Qte reserve</th>
            <th>Qte disponible</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.name }}</td>
            <td class="mono">{{ row.physical }}</td>
            <td class="mono">{{ row.reserved }}</td>
            <td class="mono">{{ row.available }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.page {
  --ink: #0f1b1d;
  --muted: #5b6a6c;
  --accent: #0e7c5b;
  --accent-soft: #dff3eb;
  --line: #e1d8cc;
  --card: #ffffff;
  font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  color: var(--ink);
  background: radial-gradient(circle at top left, #fff3e6 0%, #f5efe7 40%, #edf6f1 100%);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 18px 40px rgba(16, 24, 32, 0.08);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.4rem;
}

h1 {
  font-size: 1.8rem;
  margin: 0 0 0.4rem;
}

.subtitle {
  margin: 0;
  color: var(--muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ghost {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  padding: 0.55rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(16, 24, 32, 0.08);
}

.notice {
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: #fff6e9;
  color: #8b5a22;
  margin-bottom: 1rem;
}

.notice.error {
  background: #ffe9e9;
  color: #9f2f2f;
}

.empty {
  padding: 1.2rem 1rem;
  border-radius: 12px;
  border: 1px dashed var(--line);
  color: var(--muted);
  background: rgba(255, 255, 255, 0.6);
}

.table-card {
  background: var(--card);
  border-radius: 16px;
  border: 1px solid var(--line);
  padding: 1rem;
  overflow-x: auto;
  animation: rise 0.35s ease;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

.stock-table thead {
  background: #f7f4ef;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.stock-table th,
.stock-table td {
  padding: 0.85rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.stock-table tbody tr:hover {
  background: #fff7eb;
}

.mono {
  font-variant-numeric: tabular-nums;
}

@keyframes rise {
  from {
    opacity: 0.6;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .stock-table {
    min-width: 560px;
  }
}
</style>
