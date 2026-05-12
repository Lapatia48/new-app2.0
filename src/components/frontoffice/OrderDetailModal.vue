<script setup>
import { ref, watch, computed } from 'vue'
import { enrichRowsWithProductImages } from '@/services/entities/imagesService'
import { enrichOrderRowsWithVariants } from '@/services/frontoffice/productVariantsService'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const rows = ref([])
const loading = ref(false)
const error = ref('')

const summary = computed(() => props.entry?.summary || {})

watch(
  () => props.entry?.summary?.id,
  async (id) => {
    if (!id) {
      rows.value = []
      return
    }
    loading.value = true
    error.value = ''
    try {
      const base = props.entry.rows || []
      const withImages = await enrichRowsWithProductImages(base)
      rows.value = await enrichOrderRowsWithVariants(withImages)
    } catch (err) {
      error.value = err?.message || 'Erreur lors du chargement des details.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

function textValue(value) {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value._text !== undefined) return value._text
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return '-'
}

function formatAddress(address) {
  if (!address) return '-'
  const firstname = textValue(address.firstname)
  const lastname = textValue(address.lastname)
  const address1 = textValue(address.address1)
  const city = textValue(address.city)
  const postcode = textValue(address.postcode)
  return `${firstname} ${lastname}, ${address1}, ${postcode} ${city}`.trim()
}

function stateClass(label) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('accep')) return 'paid'
  if (normalized.includes('echec') || normalized.includes('erreur')) return 'error'
  return 'pending'
}

function close() {
  emit('close')
}
</script>

<template>
  <div class="modal" @click.self="close">
    <div class="panel">
      <header class="panel-header">
        <div>
          <h3>Commande #{{ summary.id }}</h3>
          <p class="muted">{{ summary.date }}</p>
        </div>
        <button type="button" class="ghost" @click="close">Fermer</button>
      </header>

      <div class="state-card">
        <p class="label">Etat de paiement</p>
        <span class="badge" :class="stateClass(summary.currentStateLabel)">
          {{ summary.currentStateLabel }}
        </span>
      </div>

      <div class="detail-grid">
        <div class="detail-card">
          <p class="label">Client</p>
          <p>{{ summary.customerName }}</p>
          <p class="muted">ID client: {{ textValue(entry?.customer?.id) }}</p>
        </div>
        <div class="detail-card">
          <p class="label">Adresse livraison</p>
          <p>{{ formatAddress(entry.addressDelivery) }}</p>
          <p class="label">Adresse facturation</p>
          <p>{{ formatAddress(entry.addressInvoice) }}</p>
        </div>
        <div class="detail-card">
          <p class="label">Resume</p>
          <p>Total: {{ summary.totalPaid }}</p>
        </div>
      </div>

      <div class="items">
        <div class="items-header">
          <h4>Articles</h4>
          <p class="muted">{{ rows.length }} article(s)</p>
        </div>

        <div v-if="loading" class="notice">Chargement...</div>
        <div v-else-if="error" class="notice error">{{ error }}</div>
        <div v-else-if="!rows.length" class="notice">Aucun article.</div>
        <div v-else class="items-grid">
          <article
            v-for="row in rows"
            :key="`${row.productId}-${row.productAttributeId || 0}-${row.reference}`"
            class="item"
          >
            <div class="thumb">
              <img v-if="row.imageUrl" :src="row.imageUrl" alt="" />
              <span v-else>{{ (row.name || '?').slice(0, 1) }}</span>
            </div>
            <div>
              <div class="item-title">{{ row.name }}</div>
              <div class="muted">Ref: {{ row.reference }}</div>
              <div v-if="row.specificite" class="muted">Specificite: {{ row.specificite }}</div>
              <div v-if="row.karazany" class="muted">Karazany: {{ row.karazany }}</div>
              <div class="muted">Qte: {{ row.quantity }}</div>
            </div>
            <div class="item-price">
              <div>{{ row.price }}</div>
              <div class="muted">Total {{ row.total }}</div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.panel {
  background: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
  width: min(960px, 100%);
  max-height: 85vh;
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.state-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid #eee;
  padding: 0.6rem;
  background: #fafafa;
  margin-bottom: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-card {
  border: 1px solid #ddd;
  padding: 0.6rem;
  background: #fff;
}

.label {
  font-size: 0.8rem;
  color: #666;
  margin: 0 0 0.3rem;
}

.items {
  margin-top: 0.5rem;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.6rem;
}

.items-grid {
  display: grid;
  gap: 0.6rem;
}

.item {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 0.6rem;
  align-items: center;
  border: 1px solid #ddd;
  padding: 0.5rem;
  background: #fff;
}

.thumb {
  width: 60px;
  height: 60px;
  border: 1px solid #eee;
  display: grid;
  place-items: center;
  background: #fafafa;
}

.thumb img {
  max-width: 100%;
  max-height: 100%;
}

.item-title {
  font-weight: 600;
}

.item-price {
  font-weight: 600;
  text-align: right;
}

.muted {
  color: #666;
  font-size: 0.85rem;
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

.badge.paid {
  background: #d4edda;
  color: #1f6b2f;
}

.badge.error {
  background: #f8d7da;
  color: #8a2730;
}

@media (max-width: 720px) {
  .item {
    grid-template-columns: 60px 1fr;
  }

  .item-price {
    grid-column: 2 / 3;
  }
}
</style>
