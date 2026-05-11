import { getXml, buildApiUrl } from '@/services/http/prestashopClient'
import { xmlToJson, parseXml } from '@/services/xml/xmlUtils'
import { listOrderIds } from '@/services/entities/ordersService'
import { createOrderHistory } from '@/services/entities/orderHistoriesService'
import { buildOrderConfig } from '@/services/order/commandeAchatService'

const EMPTY_LABEL = '-'

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
  if (id && id === toNumber(config.orderStatePendingId, 0)) return 'en attente'
  return `etat #${id || 0}`
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

  return {
    order,
    customer,
    cart,
    addressDelivery,
    addressInvoice,
    rows,
    summary: {
      id: toNumber(order.id, orderId),
      date: dateValue,
      customerName: getCustomerDisplayName(customer),
      totalPaid: formatMoney(pickText(order.total_paid_real, order.total_paid, 0)),
      currentStateId,
      currentStateLabel: formatStateLabel(currentStateId, config)
    }
  }
}

export async function listGestionCommandes() {
  const ids = await listOrderIds()
  const list = await Promise.all(
    ids.map(async (id) => {
      try {
        return await buildGestionCommandeDto(id)
      } catch (error) {
        return null
      }
    })
  )

  return list
    .filter(Boolean)
    .sort((a, b) => (b.summary?.id || 0) - (a.summary?.id || 0))
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
  buildGestionCommandeDto,
  listGestionCommandes,
  getStateOptions,
  changeOrderState,
  changeOrderStatePut
}
