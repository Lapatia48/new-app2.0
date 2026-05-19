import { DEFAULT_LANG_ID } from '@/services/constants'
import { createCustomer, findCustomerIdByEmail, readCustomer } from '@/services/entities/customersService'
import { createAddress, readAddress } from '@/services/entities/addressesService'
import { createCart, readCart } from '@/services/entities/cartsService'
import { createOrder, updateOrder } from '@/services/entities/ordersService'
import { createOrderDetail } from '@/services/entities/orderDetailsService'
import { createOrderHistory } from '@/services/entities/orderHistoriesService'
import {
  adjustStockQuantityByProduct,
  adjustStockQuantityByProductAttribute,
  getStockQuantityByProduct,
  getStockQuantityByProductAndAttribute,
  setQuantityForProduct,
  setQuantityForProductAttribute,
  validateStockAvailability
} from '@/services/entities/stockAvailablesService'
import { recordStockMovement } from '@/services/stock/stockHistoryService'
import { findProductInfoById, findProductInfoByReference } from '@/services/entities/productsService'
import { findProductOptionValueIdByName } from '@/services/entities/productOptionValuesService'
import { findCombinationByProductAndValueId, readCombination } from '@/services/entities/combinationsService'
import { getXml } from '@/services/http/prestashopClient'
import { toFloat, toInt } from '@/services/utils/stringUtils'
import { getText, parseXml, xmlToJson } from '@/services/xml/xmlUtils'

export async function createOrderFromCsvRow(row, config, options = {}) {
  const { preserveStock = false, skipStockAdjustments = false } = options || {}
  const shouldSkipStockAdjustments = skipStockAdjustments || preserveStock
  const orderItems = parseOrderItems(row.achat)
  if (!orderItems.length) {
    throw new Error('Empty achat')
  }

  const customerId = await ensureCustomer(row, config)
  const secureKey = await fetchCustomerSecureKey(customerId)
  if (!secureKey) {
    throw new Error('Missing secure_key for customer')
  }
  const addressId = await createAddressForCustomer(customerId, row, config)
  const resolvedItems = await resolveOrderItems(orderItems)

  if (!resolvedItems.length) {
    throw new Error('No valid products')
  }

  // Valider que le stock est disponible pour tous les items
  await validateOrderItemsStock(resolvedItems)

  const stockSnapshots = preserveStock
    ? await snapshotStockLevels(resolvedItems)
    : []

  const cartId = await createCartForOrder(customerId, addressId, resolvedItems, config)
  const totals = computeOrderTotals(resolvedItems)
  const orderStateId = resolveOrderStateId(row.etat, config)
  const orderDate = parseOrderDate(row.date)

  const orderId = await createOrder({
    id_cart: cartId,
    id_currency: config.currencyId,
    id_lang: config.langId,
    id_customer: customerId,
    id_address_delivery: addressId,
    id_address_invoice: addressId,
    id_carrier: config.carrierId,
    id_shop: config.shopId,
    id_shop_group: config.shopGroupId,
    current_state: orderStateId,
    payment: 'Paiement a la livraison',
    module: config.cashModule,
    total_paid: totals.totalPaid,
    total_paid_real: totals.totalPaid,
    total_paid_tax_incl: totals.totalPaid,
    total_paid_tax_excl: totals.totalPaid,
    total_products: totals.totalProducts,
    total_products_wt: totals.totalProducts,
    total_discounts: totals.totalDiscounts,
    total_discounts_tax_incl: totals.totalDiscounts,
    total_discounts_tax_excl: totals.totalDiscounts,
    total_shipping: totals.totalShipping,
    total_shipping_tax_incl: totals.totalShipping,
    total_shipping_tax_excl: totals.totalShipping,
    total_wrapping: totals.totalWrapping,
    total_wrapping_tax_incl: totals.totalWrapping,
    total_wrapping_tax_excl: totals.totalWrapping,
    secure_key: secureKey,
    conversion_rate: 1
  })

  await updateOrderDate(orderId, orderDate)

  for (const item of resolvedItems) {
    const lineName = item.karazany ? `${item.name} (${item.karazany})` : item.name
    const unitPrice = formatMoney(item.price)
    const lineTotal = formatMoney(item.price * item.quantity)
    await createOrderDetail({
      id_order: orderId,
      product_id: item.id,
      product_attribute_id: item.productAttributeId || 0,
      product_name: lineName,
      product_reference: item.reference,
      product_quantity: item.quantity,
      product_price: unitPrice,
      unit_price_tax_incl: unitPrice,
      unit_price_tax_excl: unitPrice,
      total_price_tax_incl: lineTotal,
      total_price_tax_excl: lineTotal,
      id_warehouse: config.warehouseId,
      id_shop: config.shopId
    })
  }

  if (orderStateId) {
    await createOrderHistory({
      id_order: orderId,
      id_order_state: orderStateId
    })
  }

  if (!shouldSkipStockAdjustments) {
    await applyOrderStateStockEffects({
      orderStateId,
      items: resolvedItems,
      config
    })
  }

  if (preserveStock) {
    await restoreStockLevels(stockSnapshots)
  }

  return orderId
}

export async function createCartFromCsvRow(row, config) {
  const orderItems = parseOrderItems(row.achat)
  if (!orderItems.length) {
    throw new Error('Empty achat')
  }

  const customerId = await ensureCustomer(row, config)
  const addressId = await createAddressForCustomer(customerId, row, config)
  const resolvedItems = await resolveOrderItems(orderItems)

  if (!resolvedItems.length) {
    throw new Error('No valid products')
  }

  return createCartForOrder(customerId, addressId, resolvedItems, config)
}

export async function createOrderFromCartId(cartId, config) {
  const cartData = await readCart(cartId)
  const cart = extractEntity(cartData, 'cart')
  if (!cart) {
    throw new Error('Panier introuvable')
  }

  const customerId = toInt(pickText(cart.id_customer), 0)
  if (!customerId) {
    throw new Error('Client manquant pour le panier')
  }

  const secureKey = await fetchCustomerSecureKey(customerId)
  if (!secureKey) {
    throw new Error('Missing secure_key for customer')
  }

  const addressDeliveryId = toInt(
    pickText(cart.id_address_delivery, cart.id_address_invoice),
    0
  )
  if (!addressDeliveryId) {
    throw new Error('Adresse manquante pour le panier')
  }
  const addressInvoiceId =
    toInt(pickText(cart.id_address_invoice), 0) || addressDeliveryId

  const items = await resolveCartItems(cart)
  if (!items.length) {
    throw new Error('Panier vide')
  }

  // Valider que le stock est disponible pour tous les items
  await validateOrderItemsStock(items)

  const totals = computeOrderTotals(items)
  const orderStateId = config.orderStatePaidId

  const orderId = await createOrder({
    id_cart: cartId,
    id_currency: config.currencyId,
    id_lang: config.langId,
    id_customer: customerId,
    id_address_delivery: addressDeliveryId,
    id_address_invoice: addressInvoiceId,
    id_carrier: config.carrierId,
    id_shop: config.shopId,
    id_shop_group: config.shopGroupId,
    current_state: orderStateId,
    payment: 'Paiement a la livraison',
    module: config.cashModule,
    total_paid: totals.totalPaid,
    total_paid_real: totals.totalPaid,
    total_paid_tax_incl: totals.totalPaid,
    total_paid_tax_excl: totals.totalPaid,
    total_products: totals.totalProducts,
    total_products_wt: totals.totalProducts,
    total_discounts: totals.totalDiscounts,
    total_discounts_tax_incl: totals.totalDiscounts,
    total_discounts_tax_excl: totals.totalDiscounts,
    total_shipping: totals.totalShipping,
    total_shipping_tax_incl: totals.totalShipping,
    total_shipping_tax_excl: totals.totalShipping,
    total_wrapping: totals.totalWrapping,
    total_wrapping_tax_incl: totals.totalWrapping,
    total_wrapping_tax_excl: totals.totalWrapping,
    secure_key: secureKey,
    conversion_rate: 1
  })

  for (const item of items) {
    const lineName = item.karazany ? `${item.name} (${item.karazany})` : item.name
    const unitPrice = formatMoney(item.price)
    const lineTotal = formatMoney(item.price * item.quantity)
    await createOrderDetail({
      id_order: orderId,
      product_id: item.id,
      product_attribute_id: item.productAttributeId || 0,
      product_name: lineName,
      product_reference: item.reference,
      product_quantity: item.quantity,
      product_price: unitPrice,
      unit_price_tax_incl: unitPrice,
      unit_price_tax_excl: unitPrice,
      total_price_tax_incl: lineTotal,
      total_price_tax_excl: lineTotal,
      id_warehouse: config.warehouseId,
      id_shop: config.shopId
    })
  }

  if (orderStateId) {
    await createOrderHistory({
      id_order: orderId,
      id_order_state: orderStateId
    })
  }

  return orderId
}

export async function loadCheckoutCart(cartId) {
  const cartData = await readCart(cartId)
  const cart = extractEntity(cartData, 'cart')
  if (!cart) {
    throw new Error('Panier introuvable')
  }

  const customerId = toInt(pickText(cart.id_customer), 0)
  const addressDeliveryId = toInt(
    pickText(cart.id_address_delivery, cart.id_address_invoice),
    0
  )
  const addressInvoiceId =
    toInt(pickText(cart.id_address_invoice), 0) || addressDeliveryId

  const [customerData, addressDelivery, addressInvoice, items] = await Promise.all([
    customerId ? readCustomer(customerId) : null,
    addressDeliveryId ? readAddress(addressDeliveryId) : null,
    addressInvoiceId ? readAddress(addressInvoiceId) : null,
    resolveCartItems(cart)
  ])

  const totals = computeOrderTotals(items)
  const customer = extractEntity(customerData, 'customer')
  const address = extractEntity(addressDelivery, 'address')

  return {
    cart,
    customer: normalizeCustomer(customer),
    addressDelivery: extractEntity(addressDelivery, 'address'),
    addressInvoice: extractEntity(addressInvoice, 'address'),
    addressText: formatAddress(address),
    items,
    total: Number.parseFloat(totals.totalPaid)
  }
}

export function buildOrderConfig() {
  return {
    langId: toInt(import.meta.env.VITE_DEFAULT_LANG_ID || DEFAULT_LANG_ID, DEFAULT_LANG_ID),
    shopId: toInt(import.meta.env.VITE_DEFAULT_SHOP_ID || '1', 1),
    shopGroupId: toInt(import.meta.env.VITE_DEFAULT_SHOP_GROUP_ID || '1', 1),
    currencyId: toInt(import.meta.env.VITE_DEFAULT_CURRENCY_ID || '1', 1),
    countryId: toInt(import.meta.env.VITE_DEFAULT_COUNTRY_ID || '0', 0),
    stateId: toInt(import.meta.env.VITE_DEFAULT_STATE_ID || '0', 0),
    customerGroupId: toInt(import.meta.env.VITE_DEFAULT_CUSTOMER_GROUP_ID || '3', 3),
    carrierId: toInt(import.meta.env.VITE_DEFAULT_CARRIER_ID || '0', 0),
    warehouseId: toInt(import.meta.env.VITE_DEFAULT_WAREHOUSE_ID || '0', 0),
    defaultCity: (import.meta.env.VITE_DEFAULT_CITY || 'City').trim(),
    defaultPostcode: (import.meta.env.VITE_DEFAULT_POSTCODE || '00000').trim(),
    cashModule: (import.meta.env.VITE_CASH_MODULE || 'ps_cashondelivery').trim(),
    orderStatePendingId: toInt(import.meta.env.VITE_ORDER_STATE_PENDING_ID || '0', 0),
    orderStatePaidId: toInt(import.meta.env.VITE_ORDER_STATE_PAID_ID || '0', 0),
    orderStateErrorId: toInt(import.meta.env.VITE_ORDER_STATE_ERROR_ID || '0', 0),
    orderStateCancelledId: toInt(import.meta.env.VITE_ORDER_STATE_CANCELLED_ID || '0', 0),
    orderStateDeliveredId: toInt(import.meta.env.VITE_ORDER_STATE_DELIVERED_ID || '0', 0)
  }
}

export function validateOrderConfig(config) {
  if (!config.currencyId) {
    throw new Error('Missing VITE_DEFAULT_CURRENCY_ID')
  }
  if (!config.langId) {
    throw new Error('Missing VITE_DEFAULT_LANG_ID')
  }
  if (!config.shopId) {
    throw new Error('Missing VITE_DEFAULT_SHOP_ID')
  }
  if (!config.shopGroupId) {
    throw new Error('Missing VITE_DEFAULT_SHOP_GROUP_ID')
  }
  if (!config.carrierId) {
    throw new Error('Missing VITE_DEFAULT_CARRIER_ID')
  }
  if (!config.warehouseId) {
    throw new Error('Missing VITE_DEFAULT_WAREHOUSE_ID')
  }
  if (!config.orderStatePaidId) {
    throw new Error('Missing VITE_ORDER_STATE_PAID_ID')
  }
}

export function parseOrderItems(raw) {
  if (!raw) {
    return []
  }
  const rawText = String(raw).trim()
  const needsUnescape = /""[^\"]+""/.test(rawText)
  const normalized = needsUnescape ? rawText.replace(/""/g, '"') : rawText
  const inner = normalized.replace(/^\s*\[\s*/, '').replace(/\s*\]\s*$/, '')
  if (!inner) {
    return []
  }

  const tuplePattern = /\([^()]*\)/g
  const itemPattern = /^\(\s*"([^"]*)"\s*;\s*([0-9]+)\s*;\s*"([^"]*)"\s*\)$/

  return (inner.match(tuplePattern) || [])
    .map((tuple) => {
      const match = tuple.match(itemPattern)
      if (!match) {
        return null
      }

      return {
        reference: match[1].trim(),
        quantity: toInt(match[2], 0),
        karazany: match[3].trim()
      }
    })
    .filter(Boolean)
}

async function ensureCustomer(row, config) {
  const email = row.email?.trim()
  if (!email) {
    throw new Error('Missing email')
  }
  const existingId = await findCustomerIdByEmail(email)
  if (existingId) {
    return existingId
  }
  const name = row.nom?.trim() || 'Client'
  const nameParts = name.split(' ').filter(Boolean)
  const firstname = nameParts.shift() || name
  const lastname = nameParts.join(' ') || name
  const password = row.pwd?.trim() || 'changeme'

  return createCustomer({
    id_lang: config.langId,
    id_shop: config.shopId,
    id_shop_group: config.shopGroupId,
    id_default_group: config.customerGroupId,
    firstname,
    lastname,
    email,
    passwd: password,
    active: 1
  })
}

async function createAddressForCustomer(customerId, row, config) {
  if (!config.countryId) {
    throw new Error('Missing VITE_DEFAULT_COUNTRY_ID')
  }
  const name = row.nom?.trim() || 'Client'
  const nameParts = name.split(' ').filter(Boolean)
  const firstname = nameParts.shift() || name
  const lastname = nameParts.join(' ') || name

  return createAddress({
    id_customer: customerId,
    id_country: config.countryId,
    id_state: config.stateId,
    alias: 'Import',
    firstname,
    lastname,
    address1: row.adresse?.trim() || 'N/A',
    city: config.defaultCity,
    postcode: config.defaultPostcode
  })
}

async function resolveOrderItems(items) {
  const resolved = []
  for (const item of items) {
    const info = await findProductInfoByReference(item.reference)
    if (!info) {
      console.log(`Order: product not found ${item.reference}`)
      continue
    }
    let productAttributeId = 0
    // Prefer TTC price when available, otherwise fall back to base price
    let price = info.priceTtc ?? info.price
    if (item.karazany) {
      const combination = await findCombinationForKarazany(info.id, item.karazany)
      if (combination) {
        productAttributeId = combination.id
        const base = info.priceTtc ?? info.price
        price = base + combination.priceImpact
      } else {
        console.log(`Order: combination not found ${item.reference} ${item.karazany}`)
      }
    }
    resolved.push({
      id: info.id,
      name: info.name || item.reference,
      price,
      reference: item.reference,
      quantity: item.quantity,
      karazany: item.karazany,
      productAttributeId
    })
  }
  return resolved
}

async function createCartForOrder(customerId, addressId, items, config) {
  const cartRows = []
  for (const item of items) {
    cartRows.push({
      id_product: item.id,
      id_product_attribute: item.productAttributeId || 0,
      id_address_delivery: addressId,
      quantity: item.quantity
    })
  }

  return createCart({
    id_customer: customerId,
    id_address_delivery: addressId,
    id_address_invoice: addressId,
    id_currency: config.currencyId,
    id_lang: config.langId,
    id_shop: config.shopId,
    id_shop_group: config.shopGroupId,
    associations: {
      cart_rows: {
        cart_row: cartRows
      }
    }
  })
}

function computeOrderTotals(items) {
  const totalProductsValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalProducts = formatMoney(totalProductsValue)
  return {
    totalProducts,
    totalPaid: totalProducts,
    totalDiscounts: formatMoney(0),
    totalShipping: formatMoney(0),
    totalWrapping: formatMoney(0)
  }
}

function formatMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '0.00'
  }
  return numeric.toFixed(2)
}

function textValue(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'object' && value._text !== undefined && value._text !== null) {
    return String(value._text)
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

function extractEntity(data, key) {
  if (!data) {
    return null
  }
  if (typeof data === 'object' && data[key]) {
    return data[key]
  }
  return data
}

function normalizeCustomer(customer) {
  if (!customer) {
    return null
  }
  const id = toInt(pickText(customer.id), 0)
  const firstname = pickText(customer.firstname) || ''
  const lastname = pickText(customer.lastname) || ''
  const email = pickText(customer.email) || ''
  const name = `${firstname} ${lastname}`.trim() || email
  if (!id && !email) {
    return null
  }
  return { id, firstname, lastname, email, name }
}

function formatAddress(address) {
  if (!address) {
    return ''
  }
  const address1 = pickText(address.address1) || ''
  const city = pickText(address.city) || ''
  const postcode = pickText(address.postcode) || ''
  return [address1, postcode, city].filter(Boolean).join(' ').trim()
}

async function resolveCartItems(cart) {
  const rowsNode = cart?.associations?.cart_rows?.cart_row
  const rawRows = ensureArray(rowsNode)
  if (!rawRows.length) {
    return []
  }

  const productCache = new Map()
  const combinationCache = new Map()
  const items = []

  for (const row of rawRows) {
    const productId = toInt(pickText(row.id_product, row.product_id), 0)
    const productAttributeId = toInt(
      pickText(row.id_product_attribute, row.product_attribute_id),
      0
    )
    const quantity = toInt(pickText(row.quantity, row.product_quantity), 0)

    if (!productId || !quantity) {
      continue
    }

    const productInfo = await getProductInfoById(productId, productCache)
    if (!productInfo) {
      continue
    }

    const priceImpact = await getCombinationPriceImpact(productAttributeId, combinationCache)
    const basePrice = productInfo.priceTtc ?? productInfo.price
    const price = (basePrice || 0) + priceImpact

    items.push({
      id: productInfo.id,
      name: productInfo.name || productInfo.reference || String(productInfo.id),
      reference: productInfo.reference || String(productInfo.id),
      price,
      quantity,
      karazany: '',
      productAttributeId: productAttributeId || 0
    })
  }

  return items
}

async function getProductInfoById(productId, cache) {
  if (cache.has(productId)) {
    return cache.get(productId)
  }
  const info = await findProductInfoById(productId)
  if (info) {
    cache.set(productId, info)
  }
  return info
}

async function getCombinationPriceImpact(combinationId, cache) {
  const id = toInt(combinationId, 0)
  if (!id) {
    return 0
  }
  if (cache.has(id)) {
    return cache.get(id)
  }
  try {
    const data = await readCombination(id)
    const combination = extractEntity(data, 'combination')
    const impact = toFloat(pickText(combination?.price, combination?.price_impact), 0)
    cache.set(id, impact)
    return impact
  } catch (error) {
    cache.set(id, 0)
    return 0
  }
}

function resolveOrderStateId(status, config) {
  const normalized = normalizeStatus(status)
  if (normalized.includes('annul')) {
    if (!config.orderStateCancelledId) {
      throw new Error('Missing VITE_ORDER_STATE_CANCELLED_ID')
    }
    return config.orderStateCancelledId
  }
  if (normalized.includes('livr')) {
    if (!config.orderStateDeliveredId) {
      throw new Error('Missing VITE_ORDER_STATE_DELIVERED_ID')
    }
    return config.orderStateDeliveredId
  }
  if (normalized.includes('echec') || normalized.includes('erreur')) {
    return config.orderStateErrorId
  }
  if (
    normalized.includes('accepte') ||
    normalized.includes('paiement') ||
    normalized.includes('paiment') ||
    normalized.includes('effectue')
  ) {
    return config.orderStatePaidId
  }
  if (config.orderStatePaidId) {
    return config.orderStatePaidId
  }
  if (config.orderStatePendingId) {
    return config.orderStatePendingId
  }
  return config.orderStateErrorId
}

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

async function fetchCustomerSecureKey(customerId) {
  const xml = await getXml(`customers/${customerId}`)
  const doc = parseXml(xml)
  return getText(doc, 'secure_key')
}

async function findCombinationForKarazany(productId, karazany) {
  if (!karazany) {
    return null
  }
  const valueId = await findProductOptionValueIdByName(karazany)
  if (!valueId) {
    return null
  }
  return findCombinationByProductAndValueId(productId, valueId)
}

async function updateOrderDate(orderId, orderDate) {
  if (!orderDate) {
    return
  }
  const xml = await getXml(`orders/${orderId}`, { display: 'full' })
  const data = xmlToJson(xml)
  const order = data.order || data
  const sanitized = stripXmlAttrs(order)
  if (sanitized.associations) {
    delete sanitized.associations
  }
  await updateOrder(orderId, { ...sanitized, date_add: orderDate, date_upd: orderDate })
}

async function applyOrderStateStockEffects({ orderStateId, items = [], config }) {
  const deliveredId = toInt(config?.orderStateDeliveredId, 0)
  const cancelledId = toInt(config?.orderStateCancelledId, 0)

  if (!orderStateId || !items.length) {
    return
  }

  if (orderStateId === deliveredId) {
    await Promise.all(
      items.map(async (item) => {
        if (!item?.id || !item.quantity) return null
        return recordStockMovement({
          productId: item.id,
          productAttributeId: item.productAttributeId || 0,
          delta: -Math.abs(item.quantity),
          priceTe: item.price
        })
      })
    )
  }

  if (orderStateId === cancelledId) {
    await Promise.all(
      items.map(async (item) => {
        if (!item?.id || !item.quantity) return null
        if (item.productAttributeId) {
          return adjustStockQuantityByProductAttribute(
            item.id,
            item.productAttributeId,
            item.quantity
          )
        }
        return adjustStockQuantityByProduct(item.id, item.quantity)
      })
    )
  }
}

async function snapshotStockLevels(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return []
  }

  const snapshots = await Promise.all(
    items.map(async (item) => {
      if (!item?.id) {
        return null
      }
      const productAttributeId = item.productAttributeId || 0
      const current = productAttributeId
        ? await getStockQuantityByProductAndAttribute(item.id, productAttributeId)
        : await getStockQuantityByProduct(item.id)
      return {
        productId: item.id,
        productAttributeId,
        currentQty: Number.isFinite(current) ? current : 0
      }
    })
  )

  return snapshots.filter(Boolean)
}

async function restoreStockLevels(snapshots = []) {
  if (!Array.isArray(snapshots) || !snapshots.length) {
    return
  }

  await Promise.all(
    snapshots.map(async (snapshot) => {
      if (!snapshot?.productId) {
        return null
      }
      const quantity = Number.isFinite(snapshot.currentQty) ? snapshot.currentQty : 0
      if (snapshot.productAttributeId) {
        return setQuantityForProductAttribute(
          snapshot.productId,
          snapshot.productAttributeId,
          quantity
        )
      }
      return setQuantityForProduct(snapshot.productId, quantity)
    })
  )
}

function stripXmlAttrs(value) {
  if (Array.isArray(value)) {
    return value.map(stripXmlAttrs)
  }
  if (value && typeof value === 'object') {
    const result = {}
    for (const [key, val] of Object.entries(value)) {
      if (key === '_attrs') {
        continue
      }
      result[key] = stripXmlAttrs(val)
    }
    return result
  }
  return value
}

function parseOrderDate(dateStr) {
  const raw = String(dateStr || '').trim()
  if (!raw) {
    return null
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]} 00:00:00`
  }

  const parts = raw.split('/')
  if (parts.length !== 3) {
    return null
  }

  const day = parts[0].padStart(2, '0')
  const month = parts[1].padStart(2, '0')
  const year = parts[2]

  if (!/^\d{4}$/.test(year)) {
    return null
  }

  const isoDate = `${year}-${month}-${day}`
  const dateObj = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(dateObj.getTime())) {
    return null
  }

  return `${isoDate} 00:00:00`
}

/**
 * Valide que tous les items de la commande ont suffisamment de stock
 * @async
 * @param {Array<Object>} items - Les items de la commande
 * @param {number} items[].id - ID du produit
 * @param {number} items[].quantity - Quantité demandée
 * @param {number} [items[].productAttributeId] - ID de l'attribut produit (optionnel)
 * @throws {Error} Si au moins un item n'a pas suffisamment de stock
 * @returns {Promise<void>}
 */
async function validateOrderItemsStock(items) {
  if (!Array.isArray(items) || !items.length) {
    return
  }

  const validations = items.map((item) =>
    validateStockAvailability(item.id, item.quantity, item.productAttributeId || 0)
  )

  await Promise.all(validations)
}
