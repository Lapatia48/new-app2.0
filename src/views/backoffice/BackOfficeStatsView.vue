<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchBackofficeSalesStats } from '@/services/backoffice/statsService'

const loading = ref(false)
const error = ref('')
const totalSalesTtc = ref(0)
const totalSalesHt = ref(0)
const totalPurchaseHt = ref(0)
const totalProfit = ref(0)
const totalInvestment = ref(0)
const investmentProfit = ref(0)
const categories = ref([])

const maxAbsProfit = computed(() => {
  if (!categories.value.length) return 0
  return Math.max(...categories.value.map((entry) => Math.abs(entry.profit || 0)))
})

function formatMoney(value) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00'
}

function profitClass(value) {
  return Number(value || 0) >= 0 ? 'profit' : 'loss'
}

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchBackofficeSalesStats()
    totalSalesTtc.value = data.totalSalesTtc
    totalSalesHt.value = data.totalSalesHt
    totalPurchaseHt.value = data.totalPurchaseHt
    totalProfit.value = data.totalProfit
    totalInvestment.value = data.totalInvestment
    investmentProfit.value = data.investmentProfit
    categories.value = data.categories || []
  } catch (err) {
    error.value = err?.message || 'Erreur lors du chargement des statistiques.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Backoffice</p>
        <h1>Statistiques ventes</h1>
        <p class="subtitle">Ventes HT, achats HT et benefices par categorie.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="ghost" :disabled="loading" @click="loadStats">
          Actualiser
        </button>
      </div>
    </header>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-else-if="loading" class="notice">Chargement...</div>

    <div v-else class="content">
      <div class="summary">
        <!-- <article class="summary-card">
          <p class="label">Ventes TTC</p>
          <p class="value">{{ formatMoney(totalSalesTtc) }}</p>
        </article> -->
        <article class="summary-card">
          <p class="label">Ventes HT</p>
          <p class="value">{{ formatMoney(totalSalesHt) }}</p>
        </article>
        <article class="summary-card">
          <p class="label">Achats HT</p>
          <p class="value">{{ formatMoney(totalPurchaseHt) }}</p>
        </article>
        <article class="summary-card">
          <p class="label">Benefices sur vente</p>
          <p class="value" :class="profitClass(totalProfit)">
            {{ formatMoney(totalProfit) }}
          </p>
        </article>
        <article class="summary-card">
          <p class="label">Benefices sur investissement</p>
          <p class="value" :class="profitClass(investmentProfit)">
            {{ formatMoney(investmentProfit) }}
          </p>
          <p class="muted">Investissement total: {{ formatMoney(totalInvestment) }}</p>
        </article>
      </div>

      <div class="table-card">
        <div class="table-header">
          <div>
            <h2>Benefice par categorie</h2>
            <p class="muted">Comparatif ventes HT vs achats HT.</p>
          </div>
          <div class="legend">
            <span class="legend-item profit">Profit</span>
            <span class="legend-item loss">Perte</span>
          </div>
        </div>

        <div v-if="!categories.length" class="empty">Aucune vente disponible.</div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>Categorie</th>
              <th>Ventes TTC</th>
              <th>Ventes HT</th>
              <th>Achats HT</th>
              <th>Benefice</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in categories" :key="entry.id">
              <td>
                <span class="category">{{ entry.name }}</span>
              </td>
              <td class="mono">{{ formatMoney(entry.salesTtc) }}</td>
              <td class="mono">{{ formatMoney(entry.sales) }}</td>
              <td class="mono">{{ formatMoney(entry.purchase) }}</td>
              <td class="mono" :class="profitClass(entry.profit)">
                {{ formatMoney(entry.profit) }}
              </td>
              <td class="bar-cell">
                <div class="bar">
                  <span
                    class="bar-fill"
                    :class="profitClass(entry.profit)"
                    :style="{
                      width: `${maxAbsProfit ? (Math.abs(entry.profit) / maxAbsProfit) * 100 : 0}%`
                    }"
                  ></span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  --ink: #101820;
  --muted: #5f6b6d;
  --accent: #0b6b6f;
  --accent-soft: #d9f0ef;
  --error: #d14b4b;
  --line: #e7e0d6;
  font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  color: var(--ink);
  background: radial-gradient(circle at top right, #f0f6ff 0%, #f7f2ea 45%, #fff8f0 100%);
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

.content {
  display: grid;
  gap: 1.5rem;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--line);
  padding: 1rem;
  display: grid;
  gap: 0.4rem;
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0;
}

.value {
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0;
}

.value.profit {
  color: #0b6b6f;
}

.value.loss {
  color: #9b3a2f;
}

.table-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--line);
  padding: 1rem;
  overflow-x: auto;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.legend {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.legend-item {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #f2efe8;
}

.legend-item.profit {
  background: #e6f4ea;
  color: #246b3b;
}

.legend-item.loss {
  background: #fbe9e7;
  color: #9b3a2f;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.table thead {
  background: #f7f4ef;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.table th,
.table td {
  padding: 0.85rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.category {
  font-weight: 600;
}

.mono {
  font-variant-numeric: tabular-nums;
}

.profit {
  color: #0b6b6f;
}

.loss {
  color: #9b3a2f;
}

.bar-cell {
  min-width: 160px;
}

.bar {
  height: 10px;
  background: #f2efe8;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: #0b6b6f;
}

.bar-fill.loss {
  background: #d14b4b;
}

.empty {
  padding: 1rem;
  border-radius: 12px;
  border: 1px dashed var(--line);
  background: rgba(255, 255, 255, 0.6);
  color: var(--muted);
}

.muted {
  color: var(--muted);
  margin: 0.2rem 0 0;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .table {
    min-width: 600px;
  }
}
</style>
