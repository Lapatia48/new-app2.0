<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/services/frontoffice/cartStore'
import { useFrontofficeSession } from '@/services/frontoffice/frontofficeSession'
import {
  buildOrderConfig,
  createOrderFromCsvRow,
  validateOrderConfig
} from '@/services/order/commandeAchatService'
import CheckoutStepCustomer from './checkout/CheckoutStepCustomer.vue'
import CheckoutStepAddress from './checkout/CheckoutStepAddress.vue'
import CheckoutStepShipping from './checkout/CheckoutStepShipping.vue'
import CheckoutStepPayment from './checkout/CheckoutStepPayment.vue'

const router = useRouter()
const { items, total, clearCart } = useCartStore()
const { user } = useFrontofficeSession()

const steps = [
  { id: 1, label: 'Compte' },
  { id: 2, label: 'Adresse' },
  { id: 3, label: 'Livraison' },
  { id: 4, label: 'Paiement' }
]

const step = ref(1)
const address = ref('')
const customer = ref(null)
const submitting = ref(false)
const error = ref('')
const success = ref(false)
const lastOrderId = ref(null)

watch(
  () => user.value,
  (value) => {
    if (value && !customer.value) {
      customer.value = value
      if (step.value === 1) {
        step.value = 2
      }
    }
  },
  { immediate: true }
)

const canSubmit = computed(() => {
  return items.value.length > 0 && address.value.trim() && (customer.value || user.value)
})

function nextStep() {
  step.value = Math.min(step.value + 1, 4)
}

function prevStep() {
  step.value = Math.max(step.value - 1, 1)
}

function handleCustomer(info) {
  customer.value = info
  nextStep()
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

function buildOrderItems(list) {
  const valid = list.filter((item) => item.reference)
  const parts = valid.map(
    (item) => `("${item.reference}";${item.quantity};"${item.karazany || ''}")`
  )
  return `[${parts.join(',')}]`
}

async function submitOrder() {
  error.value = ''
  success.value = false

  if (!canSubmit.value) {
    error.value = 'Informations manquantes.'
    return
  }

  const info = customer.value || user.value
  if (!info || !info.email) {
    error.value = 'Compte manquant.'
    return
  }

  submitting.value = true
  try {
    const config = buildOrderConfig()
    validateOrderConfig(config)

    const name =
      info.name || `${info.firstname || ''} ${info.lastname || ''}`.trim() || info.email || 'Client'

    const row = {
      date: formatDate(new Date()),
      nom: name,
      email: info.email,
      pwd: '',
      adresse: address.value.trim(),
      achat: buildOrderItems(items.value),
      etat: 'en attente paiement a la livraison'
    }

    const orderId = await createOrderFromCsvRow(row, config)
    lastOrderId.value = orderId
    success.value = true
    clearCart()
  } catch (err) {
    error.value = err?.message || 'Commande impossible.'
  } finally {
    submitting.value = false
  }
}

function goOrders() {
  router.push('/frontoffice/orders')
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Commande</h2>
        <p>Workflow en 4 etapes.</p>
      </div>
      <div class="actions">
        <RouterLink to="/frontoffice/cart" class="link">Retour panier</RouterLink>
      </div>
    </header>

    <ol class="steps">
      <li v-for="item in steps" :key="item.id" :class="{ active: step === item.id }">
        <span class="step-number">{{ item.id }}</span>
        <span>{{ item.label }}</span>
      </li>
    </ol>

    <p v-if="!items.length" class="notice">Panier vide. Ajoutez un produit.</p>

    <div v-else class="step-panel">
      <CheckoutStepCustomer v-if="step === 1" @next="handleCustomer" />

      <CheckoutStepAddress
        v-else-if="step === 2"
        v-model="address"
        @next="nextStep"
        @back="prevStep"
      />

      <CheckoutStepShipping v-else-if="step === 3" @next="nextStep" @back="prevStep" />

      <CheckoutStepPayment
        v-else
        :items="items"
        :total="total"
        :submitting="submitting"
        :error="error"
        :can-submit="canSubmit"
        :success="success"
        :order-id="lastOrderId"
        @back="prevStep"
        @submit="submitOrder"
        @go-orders="goOrders"
      />
    </div>
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
}

.link {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
}

.notice {
  padding: 0.6rem;
  border: 1px solid #eee;
  background: #fafafa;
}

.steps {
  display: flex;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  flex-wrap: wrap;
}

.steps li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #ddd;
  padding: 0.4rem 0.6rem;
  background: #f8f8f8;
  font-size: 0.9rem;
}

.steps li.active {
  border-color: #2563eb;
  color: #2563eb;
  background: #eef4ff;
}

.step-number {
  display: inline-flex;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  border: 1px solid #ccc;
  font-size: 0.8rem;
}

.step-panel {
  border: 1px solid #ddd;
  padding: 1rem;
}
</style>
