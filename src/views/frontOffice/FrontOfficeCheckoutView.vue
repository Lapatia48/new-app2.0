<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/services/frontoffice/cartStore'
import { useFrontofficeSession } from '@/services/frontoffice/frontofficeSession'
import { getXml } from '@/services/http/prestashopClient'
import {
  buildOrderConfig,
  createOrderFromCartId,
  createOrderFromCsvRow,
  loadCheckoutCart,
  validateOrderConfig
} from '@/services/order/commandeAchatService'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import CheckoutStepCustomer from './checkout/CheckoutStepCustomer.vue'
import CheckoutStepAddress from './checkout/CheckoutStepAddress.vue'
import CheckoutStepShipping from './checkout/CheckoutStepShipping.vue'
import CheckoutStepPayment from './checkout/CheckoutStepPayment.vue'

const router = useRouter()
const route = useRoute()
const { items, total, clearCart } = useCartStore()
const { user, isLoggedIn } = useFrontofficeSession()

const steps = [
  { id: 1, label: 'Compte' },
  { id: 2, label: 'Adresse' },
  { id: 3, label: 'Livraison' },
  { id: 4, label: 'Paiement' }
]

function parseStep(value, fallback = 3) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : fallback
}

const step = ref(parseStep(route.query.step, 3))
const address = ref('')
const customer = ref(null)
const submitting = ref(false)
const error = ref('')
const success = ref(false)
const lastOrderId = ref(null)
const cartItems = ref([])
const cartTotal = ref(0)
const cartLoading = ref(false)
const loadError = ref('')
const checkoutCartId = ref(null)
const addressSourceCustomerId = ref(null)

const fromCart = computed(() => Boolean(checkoutCartId.value))
const activeItems = computed(() => (fromCart.value ? cartItems.value : items.value))
const activeTotal = computed(() => (fromCart.value ? cartTotal.value : total.value))
const activeCustomer = computed(() => customer.value || user.value)

function formatAddress(node) {
  if (!node) {
    return ''
  }

  const address1 = getText(node, 'address1')
  const postcode = getText(node, 'postcode')
  const city = getText(node, 'city')
  return [address1, postcode, city].filter(Boolean).join(' ').trim()
}

async function loadCustomerAddress(customerId) {
  const parsedCustomerId = Number.parseInt(String(customerId ?? ''), 10)
  if (!Number.isFinite(parsedCustomerId) || parsedCustomerId <= 0) {
    return
  }

  if (addressSourceCustomerId.value === parsedCustomerId && address.value.trim()) {
    return
  }

  try {
    const xml = await getXml('addresses', {
      display: '[id,address1,postcode,city,id_customer]',
      limit: '0,1',
      'filter[id_customer]': parsedCustomerId
    })
    const doc = parseXml(xml)
    const addressNode = doc.querySelector('address')
    const formatted = formatAddress(addressNode)
    if (formatted) {
      address.value = formatted
      addressSourceCustomerId.value = parsedCustomerId
    }
  } catch {
    // Keep the current address field when the customer has no saved address.
  }
}

function applyInitialStep(value) {
  step.value = parseStep(value, isLoggedIn.value ? 3 : 1)
}

watch(
  isLoggedIn,
  (value) => {
    if (!value) {
      router.replace({
        name: 'frontoffice-users',
        query: {
          cartId: route.query.cartId,
          redirect: '/frontoffice/checkout',
          step: '3'
        }
      })
      return
    }

    if (!customer.value && user.value) {
      customer.value = user.value
    }

    if (step.value < 3) {
      step.value = 3
    }
  },
  { immediate: true }
)

watch(
  () => user.value,
  async (value) => {
    if (value && !customer.value) {
      customer.value = value
    }

    if (value?.id) {
      await loadCustomerAddress(value.id)
    }
  },
  { immediate: true }
)

watch(
  () => customer.value?.id,
  async (value) => {
    if (value) {
      await loadCustomerAddress(value)
    }
  },
  { immediate: true }
)

watch(
  () => route.query.step,
  (value) => {
    applyInitialStep(value)
  },
  { immediate: true }
)

const canSubmit = computed(() => {
  return activeItems.value.length > 0 && Boolean(activeCustomer.value)
})

function resetCartContext() {
  cartItems.value = []
  cartTotal.value = 0
  cartLoading.value = false
  loadError.value = ''
  address.value = ''
  if (step.value > 1) {
    step.value = 1
  }
}

async function loadCartFromQuery(cartId) {
  cartLoading.value = true
  loadError.value = ''
  error.value = ''
  success.value = false
  lastOrderId.value = null
  try {
    const data = await loadCheckoutCart(cartId)
    cartItems.value = data.items || []
    cartTotal.value = Number.isFinite(data.total) ? data.total : 0
    if (data.customer) {
      customer.value = data.customer
    }
    if (data.addressText) {
      address.value = data.addressText
    }
    applyInitialStep(route.query.step)
  } catch (err) {
    loadError.value = err?.message || 'Chargement du panier impossible.'
  } finally {
    cartLoading.value = false
  }
}

watch(
  () => route.query.cartId,
  (value) => {
    const parsed = Number.parseInt(String(value ?? ''), 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      checkoutCartId.value = parsed
      loadCartFromQuery(parsed)
      return
    }
    checkoutCartId.value = null
    resetCartContext()
  },
  { immediate: true }
)

function nextStep() {
  step.value = Math.min(step.value + 1, 4)
}

function prevStep() {
  step.value = Math.max(step.value - 1, 1)
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

  const info = activeCustomer.value
  if (!info || !info.email) {
    error.value = 'Compte manquant.'
    return
  }

  submitting.value = true
  try {
    const config = buildOrderConfig()
    validateOrderConfig(config)

    if (fromCart.value) {
      const orderId = await createOrderFromCartId(checkoutCartId.value, config)
      lastOrderId.value = orderId
      success.value = true
      return
    }

    const name =
      info.name || `${info.firstname || ''} ${info.lastname || ''}`.trim() || info.email || 'Client'

    const row = {
      date: formatDate(new Date()),
      nom: name,
      email: info.email,
      pwd: '',
      adresse: address.value.trim() || 'N/A',
      achat: buildOrderItems(items.value),
      etat: 'paiement accepte'
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

    <p v-if="loadError" class="notice error">{{ loadError }}</p>
    <p v-else-if="cartLoading" class="notice">Chargement du panier...</p>
    <p v-else-if="!activeItems.length" class="notice">Panier vide. Ajoutez un produit.</p>

    <div v-else class="step-panel">
      <CheckoutStepCustomer v-if="step === 1" @next="nextStep" />

      <CheckoutStepAddress
        v-else-if="step === 2"
        v-model="address"
        @next="nextStep"
        @back="prevStep"
      />

      <CheckoutStepShipping v-else-if="step === 3" @next="nextStep" @back="prevStep" />

      <CheckoutStepPayment
        v-else
        :items="activeItems"
        :total="activeTotal"
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

.notice.error {
  border-color: #f5c2c2;
  background: #fdecec;
  color: #a62929;
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
