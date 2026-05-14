<script setup>
import { ref, watch, computed } from 'vue'
import {
  buildGestionCommandeDto,
  changeOrderState,
  getStateOptions
} from '@/services/dto/GestionCommandeDto'
import { enrichRowsWithProductImages } from '@/services/entities/imagesService'

const props = defineProps({ entry: { type: Object, required: false } })
const emit = defineEmits(['close', 'updated'])

const dto = ref(null)
const details = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const states = ref(getStateOptions())
const selectedState = ref(null)

const summary = computed(() => dto.value?.summary || props.entry?.summary || {})
const isCart = computed(() => summary.value?.isCart)
const notOrdered = ref(false)

watch(
  () => props.entry?.id,
  async (id) => {
    if (id) {
      await loadDetails()
      return
    }
    dto.value = null
    details.value = []
    selectedState.value = null
  },
  { immediate: true }
)

async function loadDetails() {
  if (!props.entry || !props.entry.id) return
  if (props.entry?.summary?.isCart) {
    dto.value = { summary: props.entry.summary }
    details.value = []
    selectedState.value = null
    return
  }
  loading.value = true
  error.value = ''
  notOrdered.value = false
  try {
    dto.value = await buildGestionCommandeDto(props.entry.id)
    const rows = dto.value.rows || []
    details.value = await enrichRowsWithProductImages(rows)
    selectedState.value = dto.value?.summary?.currentStateId || null
  } catch (err) {
    const status = err?.status || err?.response?.status
    if (status === 404) {
      notOrdered.value = true
      error.value = ''
      dto.value = { summary: props.entry?.summary || {} }
      details.value = []
      selectedState.value = null
    } else {
      error.value = err?.message || 'Erreur lors du chargement de la commande.'
    }
  } finally {
    loading.value = false
  }
}

async function saveSelectedState() {
  if (!props.entry || !props.entry.id) return
  if (!selectedState.value) return
  saving.value = true
  error.value = ''
  try {
    await changeOrderState(props.entry.id, selectedState.value)
    await loadDetails()
    emit('updated')
  } catch (err) {
    error.value = err?.message || "Impossible d'enregistrer l'etat."
  } finally {
    saving.value = false
  }
}

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
  if (normalized.includes('panier')) return 'cart'
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
          <p class="eyebrow">Commande</p>
          <h2>#{{ summary.id || entry?.id }}</h2>
          <p class="meta">{{ summary.date || '-' }} · {{ summary.customerName || '-' }}</p>
        </div>
        <div class="header-actions">
          <button class="ghost" @click="close">Fermer</button>
        </div>
      </header>

      <section v-if="loading" class="notice">Chargement des details...</section>

      <section v-else>
        <div v-if="error" class="notice error">{{ error }}</div>

        <div class="state-card">
          <div>
            <p class="label">Etat de paiement</p>
            <span class="badge" :class="stateClass(summary.currentStateLabel)">
              {{ summary.currentStateLabel || '-' }}
            </span>
            <p v-if="isCart" class="hint">Panier en attente de validation.</p>
          </div>
          <div v-if="!isCart" class="state-form">
            <label class="label">Modifier</label>
            <div class="state-controls">
              <select v-model="selectedState">
                <option v-for="s in states" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
              <button type="button" class="primary" :disabled="saving || !selectedState" @click="saveSelectedState">
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Client</h3>
            <p>{{ summary.customerName || '-' }}</p>
            <p class="muted">ID client: {{ textValue(dto?.customer?.id) }}</p>
          </div>
          <div class="card">
            <h3>Adresse livraison</h3>
            <p>{{ formatAddress(dto?.addressDelivery) }}</p>
            <h3>Adresse facturation</h3>
            <p>{{ formatAddress(dto?.addressInvoice) }}</p>
          </div>
          <div class="card">
            <h3>Resume</h3>
            <p>Commande #{{ summary.id || '-' }}</p>
            <p>Date: {{ summary.date || '-' }}</p>
            <p>Total: {{ summary.totalPaid || '-' }}</p>
          </div>
        </div>

        <div class="items">
          <div class="items-header">
            <h3>Articles</h3>
            <p class="muted">{{ details.length }} article(s)</p>
          </div>

          <div v-if="isCart || notOrdered" class="empty">Pas encore commandee.</div>
          <div v-else-if="!details.length" class="empty">Aucun article associe a la commande.</div>
          <div v-else class="items-grid">
            <article v-for="it in details" :key="`${it.productId}-${it.productAttributeId || 0}-${it.reference}`" class="item">
              <div class="thumb">
                <img v-if="it.imageUrl" :src="it.imageUrl" alt="" />
                <span v-else>{{ (it.name || '?').slice(0, 1) }}</span>
              </div>
              <div class="item-body">
                <div class="item-title">{{ it.name || '-' }}</div>
                <div class="item-meta">Ref: {{ it.reference }}</div>
                <div class="item-meta">Qte: {{ it.quantity }}</div>
                <div class="item-price">{{ it.price }}</div>
              </div>
              <div class="item-total">Total {{ it.total }}</div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(7, 16, 24, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
  backdrop-filter: blur(4px);
}

.panel {
  --ink: #101820;
  --muted: #5f6b6d;
  --accent: #0b6b6f;
  --accent-soft: #d9f0ef;
  --error: #d14b4b;
  --line: #e7e0d6;
  font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  background: linear-gradient(160deg, #ffffff 0%, #f7f4ef 100%);
  color: var(--ink);
  padding: 1.5rem;
  max-width: 940px;
  width: min(940px, 100%);
  max-height: 85vh;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid var(--line);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  animation: pop 0.3s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.4rem;
}

.meta {
  margin: 0.4rem 0 0;
  color: var(--muted);
}

.ghost {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  padding: 0.55rem 1rem;
  border-radius: 999px;
  cursor: pointer;
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

.state-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: #fff;
  margin-bottom: 1.2rem;
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.35rem;
}

.state-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

select {
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
}

.primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(11, 107, 111, 0.25);
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

.hint {
  margin: 0.35rem 0 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.badge.paid {
  background: var(--accent-soft);
  color: var(--accent);
}

.badge.error {
  background: #ffe3e3;
  color: var(--error);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--line);
  padding: 1rem;
}

.card h3 {
  margin-top: 0;
}

.muted {
  color: var(--muted);
  margin-top: 0.4rem;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.items-grid {
  display: grid;
  gap: 0.75rem;
}

.item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--line);
}

.thumb {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  overflow: hidden;
  background: #f0efe8;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 600;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-title {
  font-weight: 600;
}

.item-meta {
  color: var(--muted);
  font-size: 0.85rem;
}

.item-price {
  font-variant-numeric: tabular-nums;
}

.item-total {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--accent);
}

.empty {
  padding: 1rem;
  border-radius: 12px;
  border: 1px dashed var(--line);
  background: rgba(255, 255, 255, 0.6);
  color: var(--muted);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 900px) {
  .state-card {
    flex-direction: column;
    align-items: stretch;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .item {
    grid-template-columns: auto 1fr;
  }

  .item-total {
    grid-column: 2 / 3;
  }
}
</style>
