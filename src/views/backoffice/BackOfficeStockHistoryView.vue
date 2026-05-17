<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { listProducts } from '@/services/entities/productsService'
import { listStocks } from '@/services/entities/stocksService'
import { listStockHistory } from '@/services/stock/stockHistoryService'
import {
  getStockQuantityByProduct,
  getStockQuantityByProductAndAttribute
} from '@/services/entities/stockAvailablesService'

const stockEntries = ref([])
const stocksError = ref('')
const isLoadingStocks = ref(false)
const selectedStockId = ref('')

const historyDate = ref(new Date().toISOString().slice(0, 10))
const movements = ref([])
const currentStock = ref(null)
const isLoadingHistory = ref(false)
const historyError = ref('')

const selectedStock = computed(() =>
  stockEntries.value.find((entry) => String(entry.id) === String(selectedStockId.value)) || null
)

const hasSelection = computed(() => Boolean(selectedStock.value?.id))

const movementCount = computed(() => movements.value.length)
const totalDelta = computed(() =>
  movements.value.reduce((sum, entry) => sum + (Number(entry.delta) || 0), 0)
)

function formatQty(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value)
}

function formatDelta(value) {
  const numeric = Number(value) || 0
  return numeric >= 0 ? `+${numeric}` : `${numeric}`
}

async function loadStocks() {
  isLoadingStocks.value = true
  stocksError.value = ''
  try {
    const [stocks, products] = await Promise.all([listStocks(1000), listProducts(1000)])
    const productMap = new Map(products.map((product) => [String(product.id), product]))
    stockEntries.value = stocks.map((stock) => {
      const product = productMap.get(String(stock.productId))
      const baseLabel = product
        ? product.reference
          ? `${product.reference} - ${product.name}`
          : product.name
        : stock.reference
          ? `${stock.reference} - #${stock.productId}`
          : `Produit #${stock.productId}`
      const suffix = stock.productAttributeId ? ` (Attr #${stock.productAttributeId})` : ''
      return {
        ...stock,
        label: `${baseLabel}${suffix}`
      }
    })
  } catch (error) {
    stocksError.value = error?.message || 'Erreur lors du chargement du stock.'
  } finally {
    isLoadingStocks.value = false
  }
}

async function loadHistory() {
  if (!selectedStock.value) {
    movements.value = []
    currentStock.value = null
    return
  }

  isLoadingHistory.value = true
  historyError.value = ''

  try {
    const productId = selectedStock.value.productId
    const productAttributeId = selectedStock.value.productAttributeId
    const stockQtyPromise = productAttributeId
      ? getStockQuantityByProductAndAttribute(productId, productAttributeId)
      : getStockQuantityByProduct(productId)
    const [history, stockQty] = await Promise.all([
      listStockHistory({
        stockId: selectedStock.value.id,
        date: historyDate.value || undefined
      }),
      stockQtyPromise
    ])

    movements.value = history
    currentStock.value = stockQty
  } catch (error) {
    historyError.value = error?.message || 'Erreur lors du chargement des mouvements.'
  } finally {
    isLoadingHistory.value = false
  }
}

watch(selectedStockId, () => {
  historyError.value = ''
  loadHistory()
})

watch(historyDate, () => {
  if (!selectedStock.value) {
    return
  }
  historyError.value = ''
  loadHistory()
})

onMounted(() => {
  loadStocks()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Backoffice</p>
        <h1>Historique stock</h1>
      </div>
      <div class="header-actions">
        <RouterLink class="ghost" to="/backoffice/stocks">Retour aux ajouts</RouterLink>
      </div>
    </header>

    <div class="content">
      <div class="filter-card">
        <div class="filters">
          <label class="field">
            Produit
            <select v-model="selectedStockId" :disabled="isLoadingStocks">
              <option value="">Selectionner un produit</option>
              <option v-for="entry in stockEntries" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </option>
            </select>
          </label>
          <label class="field">
            Date
            <input v-model="historyDate" type="date" />
          </label>
          <button type="button" class="ghost" :disabled="!hasSelection || isLoadingHistory" @click="loadHistory">
            Actualiser
          </button>
        </div>
        <p v-if="stocksError" class="status">{{ stocksError }}</p>
      </div>

      <div v-if="hasSelection" class="summary-grid">
        <article class="summary-card">
          <p class="label">Stock actuel</p>
          <p class="value mono">{{ formatQty(currentStock) }}</p>
        </article>
        <article class="summary-card">
          <p class="label">Mouvements</p>
          <p class="value mono">{{ movementCount }}</p>
        </article>
        <article class="summary-card">
          <p class="label">Delta total</p>
          <p class="value mono">{{ formatDelta(totalDelta) }}</p>
        </article>
      </div>

      <div v-if="hasSelection" class="table-card">
        <div class="table-header">
          <div>
            <h2>Mouvements du stock</h2>
            <p class="muted">Filtre par date applique via API.</p>
          </div>
        </div>

        <div v-if="historyError" class="notice error">{{ historyError }}</div>
        <div v-else-if="isLoadingHistory" class="notice">Chargement...</div>
        <div v-else-if="!movements.length" class="empty">Aucun mouvement pour cette date.</div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>Heure</th>
              <th>Variation</th>
              <th>Quantite</th>
              <th>Raison</th>
              <th>Employe</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in movements" :key="entry.id">
              <td class="mono">{{ entry.time || entry.timestamp }}</td>
              <td class="mono">{{ formatDelta(entry.delta) }}</td>
              <td class="mono">{{ entry.physicalQuantity }}</td>
              <td class="mono">#{{ entry.idStockMvtReason || '-' }}</td>
              <td class="mono">#{{ entry.idEmployee || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty">Selectionnez un produit pour afficher son historique.</div>
    </div>
  </section>
</template>

<style scoped>
.page {
  --ink: #0d1b1e;
  --muted: #5f6b6d;
  --accent: #1f8a70;
  --accent-soft: #e3f6f1;
  --line: #e2ddd4;
  --card: #ffffff;
  font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  color: var(--ink);
  background:
    radial-gradient(circle at top right, #f9f2e5 0%, #f3efe7 45%, #eef6f4 100%);
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

.subtitle {
  margin: 0;
  color: var(--muted);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-card,
.summary-card,
.table-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.field input {
  border-radius: 8px;
  border: 1px solid var(--line);
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  background: #fff;
}

.field select {
  border-radius: 8px;
  border: 1px solid var(--line);
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  background: #fff;
}

.status {
  margin: 0.8rem 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: end;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
  margin: 0 0 0.35rem;
}

.value {
  margin: 0;
  font-size: 1.05rem;
}

.meta {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.muted {
  color: var(--muted);
  margin: 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}

.table thead {
  background: #f5f2ea;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.table th,
.table td {
  padding: 0.8rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.empty {
  padding: 1rem;
  border: 1px dashed var(--line);
  border-radius: 12px;
  color: var(--muted);
  background: #fbfaf7;
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

.primary {
  padding: 0.6rem 1.3rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(120deg, #1f8a70, #0b6b6f);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(31, 138, 112, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(31, 138, 112, 0.35);
}

.ghost {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  padding: 0.55rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
}

.mono {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
  }

  .table {
    min-width: 520px;
  }
}
</style>
