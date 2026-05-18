<script setup>
import { ref, computed, onMounted } from 'vue'
import { listGestionCommandes, changeOrderState } from '@/services/dto/GestionCommandeDto'
import { buildOrderConfig } from '@/services/order/commandeAchatService'
import {
  getStockQuantityByProduct,
  getStockQuantityByProductAndAttribute,
  setQuantityForProduct,
  setQuantityForProductAttribute
} from '@/services/entities/stockAvailablesService'
import OrderDetail from '@/components/backoffice/OrderDetail.vue'

const orders = ref([])
const loading = ref(false)
const error = ref('')
const selected = ref(null)
const showDetail = ref(false)
const searchQuery = ref('')
const stateQuery = ref('')
const dateQuery = ref('')
const updatingId = ref(null)
const updatingState = ref(null)

const orderConfig = buildOrderConfig()
const stateIds = {
  paid: Number.parseInt(String(orderConfig.orderStatePaidId || '0'), 10) || 0,
  cancelled: Number.parseInt(String(orderConfig.orderStateCancelledId || '0'), 10) || 0,
  delivered: Number.parseInt(String(orderConfig.orderStateDeliveredId || '0'), 10) || 0
}

const stateOptions = [
  { value: '', label: 'Tous les etats' },
  { value: 'cart', label: 'dans le panier' },
  { value: 'paid', label: 'paiement accepte' },
  { value: 'cancelled', label: 'annule' },
  { value: 'delivered', label: 'livre' }
]

const filteredOrders = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const state = stateQuery.value
  const date = dateQuery.value

  return orders.value.filter((entry) => {
    const summary = entry?.summary || {}
    const stateValue = stateClass(summary.currentStateLabel)

    if (state && stateValue !== state) {
      return false
    }

    if (date && String(summary.date || '').slice(0, 10) !== date) {
      return false
    }

    if (!query) {
      return true
    }

    const searchable = [
      summary.id,
      summary.customerName,
      summary.date,
      summary.totalPaid,
      summary.currentStateLabel
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')

    return searchable.includes(query)
  })
})

async function loadOrders() {
  loading.value = true
  error.value = ''
  try {
    orders.value = await listGestionCommandes()
  } catch (err) {
    error.value = err?.message || 'Erreur lors du chargement des commandes.'
  } finally {
    loading.value = false
  }
}

function openDetail(entry) {
  selected.value = { id: entry.summary.id, summary: entry.summary }
  showDetail.value = true
}

function closeDetail() {
  selected.value = null
  showDetail.value = false
}

function resetFilters() {
  searchQuery.value = ''
  stateQuery.value = ''
  dateQuery.value = ''
}

function stateClass(label) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('panier')) return 'cart'
  if (normalized.includes('paiement') || normalized.includes('paiment') || normalized.includes('accep')) {
    return 'paid'
  }
  if (normalized.includes('annul')) return 'cancelled'
  if (normalized.includes('livr')) return 'delivered'
  if (normalized.includes('echec') || normalized.includes('erreur')) return 'error'
  return 'pending'
}

function isCart(entry) {
  return Boolean(entry?.summary?.isCart)
}

function canSwitch(entry, nextStateId) {
  if (!entry?.summary?.id || !nextStateId) return false
  if (entry.summary.isCart) return false
  const current = Number(entry.summary.currentStateId || 0)
  if (current === nextStateId) return false
  if (current !== stateIds.paid) return false
  return true
}

function isUpdating(entry, nextStateId) {
  return updatingId.value === entry?.summary?.id && updatingState.value === nextStateId
}

async function snapshotOrderStock(rows = []) {
  if (!Array.isArray(rows) || !rows.length) {
    return []
  }

  const snapshots = await Promise.all(
    rows.map(async (row) => {
      const productId = Number.parseInt(String(row?.productId ?? ''), 10)
      if (!productId) {
        return null
      }
      const productAttributeId =
        Number.parseInt(String(row?.productAttributeId ?? 0), 10) || 0
      const quantity = Number.parseInt(String(row?.quantity ?? ''), 10) || 0
      if (!quantity) {
        return null
      }
      const current = productAttributeId
        ? await getStockQuantityByProductAndAttribute(productId, productAttributeId)
        : await getStockQuantityByProduct(productId)
      return {
        productId,
        productAttributeId,
        quantity,
        currentQty: Number.isFinite(current) ? current : 0
      }
    })
  )

  return snapshots.filter(Boolean)
}

async function forceCancelStock(snapshots = []) {
  if (!Array.isArray(snapshots) || !snapshots.length) {
    return
  }

  await Promise.all(
    snapshots.map(async (snapshot) => {
      if (!snapshot?.productId) {
        return null
      }
      const target = Math.max(0, (snapshot.currentQty || 0) - (snapshot.quantity || 0))
      if (snapshot.productAttributeId) {
        return setQuantityForProductAttribute(
          snapshot.productId,
          snapshot.productAttributeId,
          target
        )
      }
      return setQuantityForProduct(snapshot.productId, target)
    })
  )
}

async function updateState(entry, nextStateId) {
  if (!canSwitch(entry, nextStateId)) {
    return
  }
  const shouldForceCancel = nextStateId === stateIds.cancelled
  updatingId.value = entry.summary.id
  updatingState.value = nextStateId
  error.value = ''
  try {
    const stockSnapshots = shouldForceCancel
      ? await snapshotOrderStock(entry.rows || [])
      : []
    await changeOrderState(entry.summary.id, nextStateId, {
      previousStateId: entry.summary.currentStateId,
      rows: entry.rows || []
    })
    if (shouldForceCancel && stockSnapshots.length) {
      await forceCancelStock(stockSnapshots)
    }
    await loadOrders()
  } catch (err) {
    error.value = err?.message || "Erreur lors de la mise a jour de l'etat."
  } finally {
    updatingId.value = null
    updatingState.value = null
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Backoffice</p>
        <h1>Gestion des commandes</h1>
        <p class="subtitle">Suivi des commandes importées et mise à jour des paiements.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="ghost" :disabled="loading" @click="loadOrders">
          Actualiser
        </button>
      </div>
    </header>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-else-if="loading" class="notice">Chargement des commandes...</div>
    <div v-else-if="!orders.length" class="empty">Aucune commande pour le moment.</div>

    <div v-else class="table-card">
      <div class="filters">
        <label class="filter search">
          Recherche globale
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ID, client, etat, total..."
          />
        </label>
        <label class="filter">
          Etat
          <select v-model="stateQuery">
            <option v-for="option in stateOptions" :key="option.value || 'all'" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="filter">
          Date
          <input v-model="dateQuery" type="date" />
        </label>
        <button type="button" class="ghost" @click="resetFilters">Reinitialiser</button>
      </div>

      <div v-if="!filteredOrders.length" class="empty in-card">
        Aucune commande ne correspond aux filtres.
      </div>

      <table v-else class="orders">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Client</th>
            <th>Total</th>
            <th>Etat</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(entry, index) in filteredOrders"
            :key="entry.summary.id"
            :style="{ '--row-index': index }"
          >
            <td class="mono">#{{ entry.summary.id }}</td>
            <td>{{ entry.summary.date }}</td>
            <td>{{ entry.summary.customerName }}</td>
            <td class="mono">{{ entry.summary.totalPaid }}</td>
            <td>
              <span class="badge" :class="stateClass(entry.summary.currentStateLabel)">
                {{ entry.summary.currentStateLabel }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button type="button" class="primary" @click="openDetail(entry)">
                  {{ isCart(entry) ? 'Voir' : 'Voir / Modifier' }}
                </button>
                <button
                  type="button"
                  class="ghost danger"
                  :disabled="!canSwitch(entry, stateIds.cancelled) || isUpdating(entry, stateIds.cancelled)"
                  @click="updateState(entry, stateIds.cancelled)"
                >
                  {{ isUpdating(entry, stateIds.cancelled) ? 'Annulation...' : 'Annuler' }}
                </button>
                <button
                  type="button"
                  class="ghost success"
                  :disabled="!canSwitch(entry, stateIds.delivered) || isUpdating(entry, stateIds.delivered)"
                  @click="updateState(entry, stateIds.delivered)"
                >
                  {{ isUpdating(entry, stateIds.delivered) ? 'Livraison...' : 'Livrer' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <OrderDetail v-if="showDetail" :entry="selected" @close="closeDetail" @updated="loadOrders" />
  </section>
</template>

<style scoped>
.page {
  --ink: #101820;
  --muted: #5f6b6d;
  --accent: #0b6b6f;
  --accent-soft: #d9f0ef;
  --warning: #f4b942;
  --error: #d14b4b;
  --card: #ffffff;
  --line: #e7e0d6;
  font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  color: var(--ink);
  background: radial-gradient(circle at top left, #fff3e6 0%, #f7f2ea 38%, #eef5f8 100%);
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
  letter-spacing: 0.2em;
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

.empty.in-card {
  margin-bottom: 0.5rem;
}

.table-card {
  background: var(--card);
  border-radius: 16px;
  border: 1px solid var(--line);
  padding: 1rem;
  overflow-x: auto;
  animation: rise 0.35s ease;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.filter {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.filter.search {
  min-width: min(320px, 100%);
  flex: 1;
}

input,
select {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d9d0c5;
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
}

.orders {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.orders thead {
  background: #f7f4ef;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.orders th,
.orders td {
  padding: 0.85rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.orders tbody tr {
  animation: fadeUp 0.35s ease both;
  animation-delay: calc(var(--row-index) * 35ms);
}

.orders tbody tr:hover {
  background: #fff7eb;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mono {
  font-variant-numeric: tabular-nums;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: #f2efe8;
  color: var(--muted);
}

.badge.pending {
  background: #fff5db;
  color: #8a5a1f;
}

.badge.cart {
  background: #eaf1ff;
  color: #35518f;
}

.badge.cancelled {
  background: #fbe9e7;
  color: #9b3a2f;
}

.badge.paid {
  background: var(--accent-soft);
  color: var(--accent);
}

.badge.delivered {
  background: #e6f4ea;
  color: #246b3b;
}

.badge.error {
  background: #ffe3e3;
  color: var(--error);
}

.primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(11, 107, 111, 0.25);
}

.ghost.danger {
  border-color: rgba(209, 75, 75, 0.4);
  color: #9f2f2f;
}

.ghost.success {
  border-color: rgba(11, 107, 111, 0.35);
  color: #0b6b6f;
}

.ghost.danger:disabled,
.ghost.success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

  .orders {
    min-width: 600px;
  }
}
</style>
