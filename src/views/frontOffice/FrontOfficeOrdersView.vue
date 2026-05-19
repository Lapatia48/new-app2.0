<script setup>
import { ref, onMounted, watch } from 'vue'
import { useFrontofficeSession } from '@/services/frontoffice/frontofficeSession'
import { listGestionCommandesByCustomer } from '@/services/dto/GestionCommandeDto'
import OrderDetailModal from '@/components/frontoffice/OrderDetailModal.vue'

const { user, isLoggedIn } = useFrontofficeSession()

const orders = ref([])
const loading = ref(false)
const error = ref('')
const selected = ref(null)

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

async function loadOrders() {
  if (!user.value?.id) {
    orders.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    orders.value = await listGestionCommandesByCustomer(user.value.id)
  } catch (err) {
    error.value = err?.message || 'Erreur chargement commandes.'
  } finally {
    loading.value = false
  }
}

function openDetail(order) {
  selected.value = order
}

function closeDetail() {
  selected.value = null
}

onMounted(() => {
  loadOrders()
})

watch(
  () => user.value?.id,
  () => loadOrders()
)
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Mes demandes</h2>
        <p>Historique des commandes.</p>
      </div>
      <div class="actions">
        <RouterLink to="/frontoffice/account" class="link">Mon compte</RouterLink>
      </div>
    </header>

    <p v-if="!isLoggedIn" class="notice">Connectez-vous pour voir vos commandes.</p>
    <p v-else-if="error" class="notice error">{{ error }}</p>
    <p v-else-if="loading" class="notice">Chargement...</p>
    <p v-else-if="!orders.length" class="notice">Aucune commande.</p>

    <div v-else class="table-card">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Total</th>
            <th>Etat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in orders" :key="entry.summary.id">
            <td>#{{ entry.summary.id }}</td>
            <td>{{ entry.summary.date }}</td>
            <td>{{ entry.summary.totalPaid }}</td>
            <td>
              <span class="badge" :class="stateClass(entry.summary.currentStateLabel)">
                {{ entry.summary.currentStateLabel }}
              </span>
            </td>
            <td>
              <button type="button" class="ghost" @click="openDetail(entry)">Voir detail</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <OrderDetailModal v-if="selected" :entry="selected" @close="closeDetail" />
  </section>
</template>

<style scoped>
.page {
  background: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.link,
button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

button.ghost {
  background: #fff;
}

.notice {
  padding: 0.6rem;
  border: 1px solid #eee;
  background: #fafafa;
}

.notice.error {
  border-color: #f5c2c2;
  background: #fdecec;
  color: #a62929;
}

.table-card {
  border: 1px solid #ddd;
  padding: 0.75rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.6rem;
  border-bottom: 1px solid #eee;
  text-align: left;
  vertical-align: top;
}

.badge {
  display: inline-flex;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #f2f2f2;
  font-size: 0.75rem;
}

.badge.pending {
  background: #fff3cd;
  color: #7a5b1b;
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
  background: #d4edda;
  color: #1f6b2f;
}

.badge.delivered {
  background: #e6f4ea;
  color: #246b3b;
}

.badge.error {
  background: #f8d7da;
  color: #8a2730;
}

.muted {
  color: #666;
  font-size: 0.85rem;
}
</style>
