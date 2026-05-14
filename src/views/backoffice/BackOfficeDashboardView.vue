<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchBackofficeDashboardStats } from '@/services/backoffice/dashboardService'

const loading = ref(false)
const error = ref('')
const daily = ref([])
const totalCount = ref(0)
const totalAmount = ref(0)

const dateQuery = ref('')
const rangeStart = ref('')
const rangeEnd = ref('')

const filteredDaily = computed(() => {
  const query = dateQuery.value
  const start = rangeStart.value
  const end = rangeEnd.value

  return daily.value.filter((entry) => {
    if (entry.date === 'Sans date') {
      return !query && !start && !end
    }
    if (query && entry.date !== query) {
      return false
    }
    if (start && entry.date < start) {
      return false
    }
    if (end && entry.date > end) {
      return false
    }
    return true
  })
})

const filteredTotalCount = computed(() =>
  filteredDaily.value.reduce((sum, entry) => sum + entry.count, 0)
)

const filteredTotalAmount = computed(() =>
  filteredDaily.value.reduce((sum, entry) => sum + entry.amount, 0)
)

const maxCount = computed(() => {
  if (!filteredDaily.value.length) return 0
  return Math.max(...filteredDaily.value.map((entry) => entry.count))
})

const rainbowPalette = [
  '#ff4d4f',
  '#ff7a45',
  '#ffa940',
  '#fadb14',
  '#73d13d',
  '#36cfc9',
  '#40a9ff',
  '#597ef7',
  '#9254de',
  '#f759ab'
]

function barColor(index) {
  return rainbowPalette[index % rainbowPalette.length]
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function resetFilters() {
  dateQuery.value = ''
  rangeStart.value = ''
  rangeEnd.value = ''
}

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchBackofficeDashboardStats()
    daily.value = data.days
    totalCount.value = data.totalCount
    totalAmount.value = data.totalAmount
  } catch (err) {
    error.value = err?.message || 'Erreur lors du chargement du tableau de bord.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Backoffice</p>
        <h1>Tableau de bord</h1>
        <p class="subtitle">Synthese des commandes par jour.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="ghost" :disabled="loading" @click="loadDashboard">
          Actualiser
        </button>
      </div>
    </header>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-else-if="loading" class="notice">Chargement...</div>

    <div v-else class="content">
      <div class="filters">
        <label class="filter">
          Date exacte
          <input v-model="dateQuery" type="date" />
        </label>
        <label class="filter">
          Du
          <input v-model="rangeStart" type="date" />
        </label>
        <label class="filter">
          Au
          <input v-model="rangeEnd" type="date" />
        </label>
        <button type="button" class="ghost" @click="resetFilters">Reinitialiser</button>
      </div>

      <div class="summary">
        <article class="summary-card">
          <p class="label">Total commandes</p>
          <p class="value">{{ filteredTotalCount }}</p>
        </article>
        <article class="summary-card">
          <p class="label">Montant total</p>
          <p class="value">{{ formatMoney(filteredTotalAmount) }}</p>
        </article>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h2>Commandes par jour</h2>
          <p class="muted">Histogramme (nb de commandes)</p>
        </div>
        <div v-if="!filteredDaily.length" class="empty">Aucune commande.</div>
        <div v-else class="bars-scroll">
          <div class="bars">
            <div v-for="(entry, index) in filteredDaily" :key="entry.date" class="bar">
              <div
                class="bar-fill"
                :style="{
                  height: `${maxCount ? (entry.count / maxCount) * 100 : 0}%`,
                  background: barColor(index)
                }"
              ></div>
              <div class="bar-value">{{ entry.count }}</div>
              <div class="bar-label">{{ entry.date }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="table-card">
        <table class="table">
          <thead>
            <tr>
              <th>Jour</th>
              <th>Nb commandes</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filteredDaily" :key="entry.date">
              <td>{{ entry.date }}</td>
              <td class="mono">{{ entry.count }}</td>
              <td class="mono">{{ formatMoney(entry.amount) }}</td>
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

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.filter {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--muted);
}

input {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d9d0c5;
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 1rem;
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.35rem;
}

.value {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
}

.chart-card,
.table-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 1rem;
}

.chart-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.bars-scroll {
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.bars {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 80px;
  gap: 0.9rem;
  align-items: end;
  min-height: 220px;
}

.bar {
  display: grid;
  gap: 0.35rem;
  align-items: end;
  justify-items: center;
}

.bar-fill {
  width: 100%;
  min-height: 6px;
  border-radius: 12px 12px 6px 6px;
  transition: height 0.25s ease;
}

.bar-value {
  font-weight: 600;
  font-size: 0.85rem;
}

.bar-label {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: center;
  word-break: break-word;
}

.chart-row {
  display: grid;
  grid-template-columns: 120px 1fr 40px;
  gap: 0.75rem;
  align-items: center;
}

.chart-label {
  font-size: 0.85rem;
  color: var(--muted);
}

.chart-bar {
  height: 10px;
  background: #f2efe8;
  border-radius: 999px;
  overflow: hidden;
}

.chart-fill {
  height: 100%;
  background: var(--accent);
  border-radius: inherit;
}

.chart-value {
  text-align: right;
  font-weight: 600;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  text-align: left;
  padding: 0.6rem 0.4rem;
  border-bottom: 1px solid #eee;
}

.empty {
  padding: 1rem;
  border-radius: 12px;
  border: 1px dashed var(--line);
  color: var(--muted);
  background: rgba(255, 255, 255, 0.6);
}

.muted {
  color: var(--muted);
}

.mono {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .chart-row {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .chart-value {
    text-align: left;
  }

  .bars {
    grid-auto-columns: 64px;
  }
}
</style>
