import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'new-app2-frontoffice-cart'
const cartState = ref(loadCart())

function loadCart() {
  if (typeof localStorage === 'undefined') {
    return []
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.map(normalizeItem).filter(Boolean)
  } catch {
    return []
  }
}

function saveCart(list) {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildItemKey(item) {
  const reference = String(item.reference || '').trim()
  const combinationId = Number.isFinite(Number(item.combinationId))
    ? Number(item.combinationId)
    : null
  const karazany = String(item.karazany || '').trim()
  const variantKey = combinationId ? `comb:${combinationId}` : karazany ? `val:${karazany}` : 'base'
  return `${reference}|${variantKey}`
}

function normalizeItem(item) {
  if (!item) {
    return null
  }
  const reference = String(item.reference || '').trim()
  if (!reference) {
    return null
  }
  const quantity = Math.max(1, Math.round(toNumber(item.quantity, 1)))
  const price = toNumber(item.price, 0)
  const name = String(item.name || '').trim() || reference
  const specificite = String(item.specificite || '').trim()
  const karazany = String(item.karazany || '').trim()
  const productId = Number.isFinite(Number(item.productId)) ? Number(item.productId) : null
  const combinationId = Number.isFinite(Number(item.combinationId))
    ? Number(item.combinationId)
    : null
  const specificiteId = Number.isFinite(Number(item.specificiteId))
    ? Number(item.specificiteId)
    : null
  const valueId = Number.isFinite(Number(item.valueId)) ? Number(item.valueId) : null
  return {
    key: buildItemKey({ reference, karazany, combinationId }),
    reference,
    name,
    price,
    quantity,
    imageUrl: item.imageUrl || null,
    specificite: specificite || null,
    karazany: karazany || null,
    productId,
    combinationId,
    specificiteId,
    valueId
  }
}

watch(
  cartState,
  (value) => {
    saveCart(value)
  },
  { deep: true }
)

const count = computed(() =>
  cartState.value.reduce((sum, item) => sum + (item.quantity || 0), 0)
)

const total = computed(() =>
  cartState.value.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0)
)

function addItem(product, quantity = 1) {
  const entry = normalizeItem({ ...product, quantity })
  if (!entry) {
    return
  }
  const existing = cartState.value.find((item) => item.key === entry.key)
  if (existing) {
    existing.quantity += entry.quantity
    if (!existing.name && entry.name) {
      existing.name = entry.name
    }
    if (!existing.imageUrl && entry.imageUrl) {
      existing.imageUrl = entry.imageUrl
    }
    if (entry.price) {
      existing.price = entry.price
    }
    if (entry.specificite) {
      existing.specificite = entry.specificite
    }
    if (entry.karazany) {
      existing.karazany = entry.karazany
    }
    if (entry.combinationId) {
      existing.combinationId = entry.combinationId
    }
    if (entry.specificiteId) {
      existing.specificiteId = entry.specificiteId
    }
    if (entry.valueId) {
      existing.valueId = entry.valueId
    }
    return
  }
  cartState.value.push(entry)
}

function updateItem(key, quantity) {
  const refKey = String(key || '').trim()
  if (!refKey) {
    return
  }
  const index = cartState.value.findIndex((item) => item.key === refKey)
  if (index === -1) {
    return
  }
  const nextQty = Math.round(toNumber(quantity, 0))
  if (nextQty <= 0) {
    cartState.value.splice(index, 1)
    return
  }
  cartState.value[index].quantity = nextQty
}

function removeItem(key) {
  const refKey = String(key || '').trim()
  if (!refKey) {
    return
  }
  cartState.value = cartState.value.filter((item) => item.key !== refKey)
}

function clearCart() {
  cartState.value = []
}

export function useCartStore() {
  return {
    items: cartState,
    count,
    total,
    addItem,
    updateItem,
    removeItem,
    clearCart
  }
}
