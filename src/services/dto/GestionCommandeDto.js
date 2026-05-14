import { getXml, buildApiUrl } from '@/services/http/prestashopClient'
import { xmlToJson, parseXml, extractIdsByTag } from '@/services/xml/xmlUtils'
import { listOrderIds } from '@/services/entities/ordersService'
import { listCartIds } from '@/services/entities/cartsService'
import { readCombination } from '@/services/entities/combinationsService'
import { findProductInfoById } from '@/services/entities/productsService'
import { createOrderHistory } from '@/services/entities/orderHistoriesService'
import { buildOrderConfig } from '@/services/order/commandeAchatService'

const EMPTY_LABEL = '-'
const CART_LABEL = 'dans le panier'

function textValue(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'object') {
    if (value._text !== undefined && value._text !== null) {
      return String(value._text)
    }
    return null
  }
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function pickText(...values) {
  for (const value of values) {
    const text = textValue(value)
    if (text !== null && text !== '') {
      return text
    }
  }
  return null
}

function ensureArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(String(pickText(value) ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toFloat(value, fallback = 0) {
  const parsed = Number.parseFloat(String(pickText(value) ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatMoney(value) {
  return toFloat(value, 0).toFixed(2)
}

function formatStateLabel(stateId, config) {
  const id = toNumber(stateId, 0)
  if (id && id === toNumber(config.orderStatePaidId, 0)) return 'acceptee'
  if (id && id === toNumber(config.orderStateErrorId, 0)) return 'echec'
  return 'en attente'
}

function getCustomerDisplayName(customer) {
  if (!customer) return EMPTY_LABEL
  const firstname = pickText(customer.firstname) || ''
  const lastname = pickText(customer.lastname) || ''
  const email = pickText(customer.email) || ''
  const fullName = `${firstname} ${lastname}`.trim()
  if (fullName && email) return `${fullName} (${email})`
  return fullName || email || EMPTY_LABEL
}

function normalizeOrderRow(row) {
  const productId = toNumber(pickText(row.product_id, row.id_product), 0)
  const productAttributeId = toNumber(pickText(row.product_attribute_id, row.id_product_attribute), 0)
  const imageId = toNumber(pickText(row.id_image), 0)
  const quantity = toNumber(pickText(row.product_quantity, row.quantity), 0)
  const unitPrice = toFloat(pickText(row.unit_price_tax_incl, row.product_price, row.price), 0)
  const total = toFloat(pickText(row.total_price_tax_incl, row.total_price), unitPrice * quantity)

  return {
    productId: productId || null,
    productAttributeId: productAttributeId || 0,
    imageId: imageId || 0,
    reference: pickText(row.product_reference, row.reference) || EMPTY_LABEL,
    name: pickText(row.product_name, row.name) || EMPTY_LABEL,
    quantity,
    price: formatMoney(unitPrice),
    total: formatMoney(total),
    imageUrl: null
  }
}

async function fetchProductInfoByIdCached(productId, cache) {
  if (!productId) {
    return null
  }
  if (cache.has(productId)) {
    return cache.get(productId)
  }
  const info = await findProductInfoById(productId)
  cache.set(productId, info || null)
  return info || null
}

async function fetchCombinationPriceImpact(combinationId, cache) {
  const id = toNumber(combinationId, 0)
  if (!id) {
    return 0
  }
  if (cache.has(id)) {
    return cache.get(id)
  }
  try {
    const data = await readCombination(id)
    const combination = data?.combination || data
    const impact = toFloat(pickText(combination?.price, combination?.price_impact), 0)
    cache.set(id, impact)
    return impact
  } catch (error) {
    cache.set(id, 0)
    return 0
  }
}

function normalizeCartRow(row, productInfo, priceImpact = 0) {
  const productId = toNumber(pickText(row.id_product, row.product_id), 0)
  const productAttributeId = toNumber(
    pickText(row.id_product_attribute, row.product_attribute_id),
    0
  )
  const quantity = toNumber(pickText(row.quantity, row.product_quantity), 0)
  const unitPrice = (productInfo?.price || 0) + priceImpact

  return {
    productId: productId || null,
    productAttributeId: productAttributeId || 0,
    imageId: 0,
    reference: productInfo?.reference || EMPTY_LABEL,
    name: productInfo?.name || productInfo?.reference || EMPTY_LABEL,
    quantity,
    price: formatMoney(unitPrice),
    total: formatMoney(unitPrice * quantity),
    imageUrl: null
  }
}

async function fetchFirstProductImageUrl(productId, cache) {
  if (!productId) return null
  if (cache.has(productId)) return cache.get(productId)
  try {
    const imagesXml = await getXml(`images/products/${productId}`)
    const doc = parseXml(imagesXml)
    const img = doc.querySelector('image')
    const imageId = img?.getAttribute('id') || img?.querySelector('id')?.textContent
    const url = imageId ? buildApiUrl(`images/products/${productId}/${imageId}`) : null
    cache.set(productId, url)
    return url
  } catch (e) {
    cache.set(productId, null)
    return null
  }
}

function scoreOrderRow(row) {
  let score = 0
  if (row.name && row.name !== EMPTY_LABEL) score += row.name.length
  if (row.reference && row.reference !== EMPTY_LABEL) score += row.reference.length
  if (row.imageUrl) score += 10
  if (row.productAttributeId) score += 4
  return score
}

function dedupeOrderRows(rows) {
  const map = new Map()

  for (const row of rows) {
    const key = row.productId
      ? `${row.productId}:${row.productAttributeId || 0}`
      : `${row.reference}:${row.name}`
    const existing = map.get(key)

    if (!existing) {
      map.set(key, row)
      continue
    }

    const best = scoreOrderRow(row) > scoreOrderRow(existing) ? row : existing
    map.set(key, best)
  }

  return Array.from(map.values())
}

export async function fetchOrderFull(orderId) {
  const xml = await getXml(`orders/${orderId}`, { display: 'full' })
  const data = xmlToJson(xml)
  return data.order || data
}

export async function fetchCustomerFull(customerId) {
  if (!customerId) return null
  const xml = await getXml(`customers/${customerId}`, { display: 'full' })
  const data = xmlToJson(xml)
  return data.customer || data
}

export async function fetchCartFull(cartId) {
  if (!cartId) return null
  const xml = await getXml(`carts/${cartId}`, { display: 'full' })
  const data = xmlToJson(xml)
  return data.cart || data
}

export async function fetchAddressFull(addressId) {
  if (!addressId) return null
  const xml = await getXml(`addresses/${addressId}`, { display: 'full' })
  const data = xmlToJson(xml)
  return data.address || data
}

export async function fetchOrderRows(orderObj) {
  if (!orderObj) return []
  const assoc = orderObj.associations || {}
  const rowsNode = assoc.order_rows?.order_row
  const rawRows = ensureArray(rowsNode)
  if (!rawRows.length) return []

  const imageCache = new Map()
  const normalized = await Promise.all(
    rawRows.map(async (row) => {
      const mapped = normalizeOrderRow(row)
      let imageUrl = null
      if (mapped.productId && mapped.imageId) {
        imageUrl = buildApiUrl(`images/products/${mapped.productId}/${mapped.imageId}`)
      } else {
        imageUrl = await fetchFirstProductImageUrl(mapped.productId, imageCache)
      }
      return { ...mapped, imageUrl }
    })
  )

  return dedupeOrderRows(normalized)
}

export async function fetchCartRows(cartObj) {
  if (!cartObj) return []
  const assoc = cartObj.associations || {}
  const rowsNode = assoc.cart_rows?.cart_row
  const rawRows = ensureArray(rowsNode)
  if (!rawRows.length) return []

  const productCache = new Map()
  const combinationCache = new Map()
  const imageCache = new Map()

  const normalized = await Promise.all(
    rawRows.map(async (row) => {
      const productId = toNumber(pickText(row.id_product, row.product_id), 0)
      const quantity = toNumber(pickText(row.quantity, row.product_quantity), 0)
      if (!productId || quantity <= 0) {
        return null
      }
      const productAttributeId = toNumber(
        pickText(row.id_product_attribute, row.product_attribute_id),
        0
      )
      const productInfo = await fetchProductInfoByIdCached(productId, productCache)
      const priceImpact = await fetchCombinationPriceImpact(productAttributeId, combinationCache)
      const mapped = normalizeCartRow(row, productInfo, priceImpact)
      const imageUrl = await fetchFirstProductImageUrl(mapped.productId, imageCache)
      return { ...mapped, imageUrl }
    })
  )

  return dedupeOrderRows(normalized.filter(Boolean))
}

function computeRowsTotal(rows = []) {
  return rows.reduce((sum, row) => sum + toFloat(row.total, 0), 0)
}

function parseDateValue(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === EMPTY_LABEL) {
    return 0
  }
  const normalized = raw.replace(' ', 'T')
  const parsed = new Date(normalized)
  const ts = parsed.getTime()
  return Number.isFinite(ts) ? ts : 0
}

export async function buildGestionCommandeDto(orderId) {
  const orderData = await fetchOrderFull(orderId)
  const order = orderData.order || orderData
  const idCustomer = toNumber(order.id_customer, 0)
  const idCart = toNumber(order.id_cart, 0)
  const idAddressDelivery = toNumber(order.id_address_delivery, 0)
  const idAddressInvoice = toNumber(order.id_address_invoice, 0)

  const [customer, cart, addressDelivery, addressInvoice, rows] = await Promise.all([
    idCustomer ? fetchCustomerFull(idCustomer) : null,
    idCart ? fetchCartFull(idCart) : null,
    idAddressDelivery ? fetchAddressFull(idAddressDelivery) : null,
    idAddressInvoice ? fetchAddressFull(idAddressInvoice) : null,
    fetchOrderRows(order)
  ])

  const config = buildOrderConfig()
  const currentStateId = toNumber(order.current_state, 0)
  const dateValue = pickText(order.date_add, order.invoice_date) || EMPTY_LABEL
  const resolvedOrderId = toNumber(order.id, orderId)
  const resolvedCartId = toNumber(order.id_cart, idCart)

  return {
    order,
    customer,
    cart,
    addressDelivery,
    addressInvoice,
    rows,
    summary: {
      id: resolvedOrderId,
      orderId: resolvedOrderId,
      cartId: resolvedCartId || 0,
      date: dateValue,
      customerName: getCustomerDisplayName(customer),
      totalPaid: formatMoney(pickText(order.total_paid_real, order.total_paid, 0)),
      currentStateId,
      currentStateLabel: formatStateLabel(currentStateId, config),
      isCart: false
    }
  }
}

export async function buildGestionPanierDto(cartId) {
  const cartData = await fetchCartFull(cartId)
  const cart = cartData?.cart || cartData
  if (!cart) {
    return null
  }

  const idCustomer = toNumber(cart.id_customer, 0)
  if (!idCustomer) {
    return null
  }
  const idAddressDelivery = toNumber(cart.id_address_delivery, 0)
  const idAddressInvoice = toNumber(cart.id_address_invoice, 0)

  const [customer, addressDelivery, addressInvoice, rows] = await Promise.all([
    idCustomer ? fetchCustomerFull(idCustomer) : null,
    idAddressDelivery ? fetchAddressFull(idAddressDelivery) : null,
    idAddressInvoice ? fetchAddressFull(idAddressInvoice) : null,
    fetchCartRows(cart)
  ])

  if (!rows.length) {
    return null
  }

  const dateValue = pickText(cart.date_add, cart.date_upd) || EMPTY_LABEL
  const resolvedCartId = toNumber(cart.id, cartId)
  const totalValue = computeRowsTotal(rows)

  return {
    order: null,
    cart,
    customer,
    addressDelivery,
    addressInvoice,
    rows,
    summary: {
      id: resolvedCartId,
      orderId: null,
      cartId: resolvedCartId,
      date: dateValue,
      customerName: getCustomerDisplayName(customer),
      totalPaid: formatMoney(totalValue),
      currentStateId: 0,
      currentStateLabel: CART_LABEL,
      isCart: true
    }
  }
}

export async function listGestionCommandes() {
  const ids = await listOrderIds()
  const orderList = await Promise.all(
    ids.map(async (id) => {
      try {
        return await buildGestionCommandeDto(id)
      } catch (error) {
        return null
      }
    })
  )

  const orders = orderList.filter(Boolean)
  const orderCartIds = new Set(
    orders
      .map((entry) => toNumber(entry?.order?.id_cart, entry?.summary?.cartId || 0))
      .filter((value) => value)
  )

  const cartIds = await listCartIds()
  const cartList = await Promise.all(
    cartIds
      .filter((id) => !orderCartIds.has(id))
      .map(async (id) => {
        try {
          return await buildGestionPanierDto(id)
        } catch (error) {
          return null
        }
      })
  )

  const list = [...orders, ...cartList.filter(Boolean)]

  return list.sort((a, b) => {
    const dateA = parseDateValue(a.summary?.date)
    const dateB = parseDateValue(b.summary?.date)
    if (dateA !== dateB) {
      return dateB - dateA
    }
    return (b.summary?.id || 0) - (a.summary?.id || 0)
  })
}

export async function listGestionCommandesByCustomer(customerId) {
  const id = toNumber(customerId, 0)
  if (!id) {
    return []
  }
  const orderIds = await listOrderIdsByCustomer(id)

  const orderList = await Promise.all(
    orderIds.map(async (orderId) => {
      try {
        return await buildGestionCommandeDto(orderId)
      } catch (error) {
        return null
      }
    })
  )

  const orders = orderList.filter(Boolean)
  const orderCartIds = new Set(
    orders
      .map((entry) => toNumber(entry?.order?.id_cart, entry?.summary?.cartId || 0))
      .filter((value) => value)
  )

  const cartIds = await listCartIdsByCustomer(id)
  const cartList = await Promise.all(
    cartIds
      .filter((cartId) => !orderCartIds.has(cartId))
      .map(async (cartId) => {
        try {
          return await buildGestionPanierDto(cartId)
        } catch (error) {
          return null
        }
      })
  )

  const list = [...orders, ...cartList.filter(Boolean)]

  return list.sort((a, b) => {
    const dateA = parseDateValue(a.summary?.date)
    const dateB = parseDateValue(b.summary?.date)
    if (dateA !== dateB) {
      return dateB - dateA
    }
    return (b.summary?.id || 0) - (a.summary?.id || 0)
  })
}

async function listOrderIdsByCustomer(customerId) {
  const xml = await getXml('orders', {
    display: '[id]',
    'filter[id_customer]': customerId
  })
  const doc = parseXml(xml)
  return extractIdsByTag(doc, 'order')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
}

async function listCartIdsByCustomer(customerId) {
  const xml = await getXml('carts', {
    display: '[id]',
    'filter[id_customer]': customerId
  })
  const doc = parseXml(xml)
  return extractIdsByTag(doc, 'cart')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
}

export function getStateOptions() {
  const config = buildOrderConfig()
  return [
    { id: toNumber(config.orderStatePendingId, 0), label: 'en attente' },
    { id: toNumber(config.orderStatePaidId, 0), label: 'acceptee' },
    { id: toNumber(config.orderStateErrorId, 0), label: 'echec' }
  ].filter((s) => s.id)
}

export async function changeOrderState(orderId, stateId) {
  if (!orderId) throw new Error('Missing orderId')
  if (!stateId) throw new Error('Missing stateId')
  await createOrderHistory({
    id_order: String(orderId),
    id_order_state: String(stateId)
  })
}

export const changeOrderStatePut = changeOrderState

export default {
  fetchOrderFull,
  fetchCustomerFull,
  fetchCartFull,
  fetchAddressFull,
  fetchOrderRows,
  fetchCartRows,
  buildGestionCommandeDto,
  buildGestionPanierDto,
  listGestionCommandes,
  listGestionCommandesByCustomer,
  getStateOptions,
  changeOrderState,
  changeOrderStatePut
}
