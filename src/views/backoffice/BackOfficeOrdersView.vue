<script setup>
import { ref, onMounted } from 'vue'
import { listGestionCommandes } from '@/services/dto/GestionCommandeDto'
import OrderDetail from '@/components/backoffice/OrderDetail.vue'

const orders = ref([])
const loading = ref(false)
const error = ref('')
const selected = ref(null)
const showDetail = ref(false)

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

function stateClass(label) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('panier')) return 'cart'
  if (normalized.includes('accep')) return 'paid'
  if (normalized.includes('echec') || normalized.includes('erreur')) return 'error'
  return 'pending'
}

function isCart(entry) {
  return Boolean(entry?.summary?.isCart)
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
      <table class="orders">
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
          <tr v-for="(entry, index) in orders" :key="entry.summary.id" :style="{ '--row-index': index }">
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
              <button type="button" class="primary" @click="openDetail(entry)">
                {{ isCart(entry) ? 'Voir' : 'Voir / Modifier' }}
              </button>
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

.table-card {
  background: var(--card);
  border-radius: 16px;
  border: 1px solid var(--line);
  overflow-x: auto;
  animation: rise 0.35s ease;
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

.badge.paid {
  background: var(--accent-soft);
  color: var(--accent);
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
