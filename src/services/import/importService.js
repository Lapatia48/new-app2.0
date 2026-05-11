import { DEFAULT_CATEGORY_ID, DEFAULT_LANG_ID } from '@/services/constants'
import { createCategory, findCategoryIdByName, listCategoryIds } from '@/services/entities/categoriesService'
import {
  createProduct,
  findProductIdByReference,
  findProductInfoByReference,
  listProductIds,
  updateProduct
} from '@/services/entities/productsService'
import { listStockAvailableIds, setQuantityForProduct, setQuantityForProductAttribute } from '@/services/entities/stockAvailablesService'
import { uploadProductImage } from '@/services/entities/imagesService'
import { createCustomer, findCustomerIdByEmail } from '@/services/entities/customersService'
import { createAddress } from '@/services/entities/addressesService'
import { createCart } from '@/services/entities/cartsService'
import { createOrder } from '@/services/entities/ordersService'
import { createOrderDetail } from '@/services/entities/orderDetailsService'
import { createOrderHistory } from '@/services/entities/orderHistoriesService'
import { createProductOption, findProductOptionIdByName } from '@/services/entities/productOptionsService'
import { createProductOptionValue, findProductOptionValueIdByName } from '@/services/entities/productOptionValuesService'
import { createCombinationForProduct, findCombinationByProductAndValueId } from '@/services/entities/combinationsService'
import { getXml } from '@/services/http/prestashopClient'
import { slugify, toFloat, toInt } from '@/services/utils/stringUtils'
import { getText, parseXml } from '@/services/xml/xmlUtils'

export async function runImport({ target, rows = [], files = [] }) {
  if (target === 'images') {
    return importImages(files)
  }
  if (!Array.isArray(rows)) {
    throw new Error('CSV rows are missing')
  }

  if (target === 'products') {
    return importProducts(rows)
  }
  if (target === 'stocks') {
    return importStocks(rows)
  }
  if (target === 'orders') {
    return importOrders(rows)
  }

  return { total: rows.length, success: 0 }
}

async function importProducts(rows) {
  let success = 0

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const name = row.nom?.trim()
    const reference = row.reference?.trim()

    if (!name || !reference) {
      console.log(`Row ${index + 1}: missing nom or reference`)
      continue
    }

    const categoryName = row.categorie?.trim()
    const categoryId = await ensureCategoryId(categoryName)
    const availableDate = toIsoDate(row.date_availability_produit || row.date_produit)

    const input = {
      name,
      reference,
      price: toFloat(row.prix_ttc || '0', 0),
      wholesalePrice: toFloat(row.prix_achat || '0', 0),
      categoryId,
      availableDate,
      linkRewrite: slugify(name)
    }

    try {
      const existingId = await findProductIdByReference(reference)
      if (existingId) {
        await updateProduct(existingId, input, DEFAULT_LANG_ID)
      } else {
        await createProduct(input, DEFAULT_LANG_ID)
      }
      success += 1
    } catch (error) {
      console.log(`Row ${index + 1}: ${error.message}`)
      console.log(error)
    }
  }

  verifyLists('products')

  return {
    total: rows.length,
    success
  }
}

async function importStocks(rows) {
  let success = 0
  const baseStockTotals = new Map()
  const hasCombination = new Set()
  const optionCache = new Map()
  const valueCache = new Map()
  const combinationCache = new Map()
  const productCache = new Map()

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const reference = row.reference?.trim()
    if (!reference) {
      continue
    }

    const productInfo = await getProductInfoByReference(reference, productCache)
    if (!productInfo) {
      console.log(`Stock: missing product for reference ${reference}`)
      continue
    }

    const specificite = getSpecificite(row)
    const karazany = row.karazany?.trim()
    const quantity = toInt(row.stock_initial || '0', 0)

    if (specificite && karazany) {
      hasCombination.add(reference)
      const groupId = await ensureProductOptionId(specificite, optionCache)
      const valueId = await ensureProductOptionValueId(groupId, karazany, valueCache)
      const salePrice = row.prix_vente_ttc
        ? toFloat(row.prix_vente_ttc || '0', productInfo.price)
        : productInfo.price
      const combinationId = await ensureCombinationId(
        productInfo,
        valueId,
        reference,
        karazany,
        salePrice,
        combinationCache
      )

      if (!combinationId) {
        console.log(`Stock: missing combination for ${reference} ${karazany}`)
        continue
      }

      try {
        await setQuantityForProductAttribute(productInfo.id, combinationId, quantity)
        success += 1
      } catch (error) {
        console.log(`Stock ${reference} ${karazany}: ${error.message}`)
        console.log(error)
      }

      const total = baseStockTotals.get(reference) || 0
      baseStockTotals.set(reference, total + quantity)
      continue
    }

    const total = baseStockTotals.get(reference) || 0
    baseStockTotals.set(reference, total + quantity)
  }

  for (const [reference, total] of baseStockTotals.entries()) {
    if (hasCombination.has(reference)) {
      continue
    }
    const productId = await findProductIdByReference(reference)
    if (!productId) {
      console.log(`Stock: missing product for reference ${reference}`)
      continue
    }
    try {
      await setQuantityForProduct(productId, total)
      success += 1
    } catch (error) {
      console.log(`Stock ${reference}: ${error.message}`)
      console.log(error)
    }
  }

  verifyLists('stocks')

  return {
    total: rows.length,
    success
  }
}

async function importImages(files) {
  let success = 0
  const list = Array.from(files || [])

  for (let index = 0; index < list.length; index += 1) {
    const file = list[index]
    const reference = getReferenceFromFilename(file.name)
    if (!reference) {
      console.log(`Image ${file.name}: missing reference`)
      continue
    }
    const productId = await findProductIdByReference(reference)
    if (!productId) {
      console.log(`Image ${file.name}: product not found`)
      continue
    }
    try {
      await uploadProductImage(productId, file)
      success += 1
    } catch (error) {
      console.log(`Image ${file.name}: ${error.message}`)
    }
  }

  return {
    total: list.length,
    success
  }
}

async function importOrders(rows) {
  let success = 0
  const config = getOrderConfig()
  validateOrderConfig(config)

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    try {
      const orderItems = parseOrderItems(row.achat)
      if (!orderItems.length) {
        console.log(`Row ${index + 1}: empty achat`)
        continue
      }

      const customerId = await ensureCustomer(row, config)
      const secureKey = await fetchCustomerSecureKey(customerId)
      if (!secureKey) {
        throw new Error('Missing secure_key for customer')
      }
      const addressId = await createAddressForCustomer(customerId, row, config)
      const resolvedItems = await resolveOrderItems(orderItems)

      if (!resolvedItems.length) {
        console.log(`Row ${index + 1}: no valid products`)
        continue
      }

      const cartId = await createCartForOrder(customerId, addressId, resolvedItems, config)
      const totals = computeOrderTotals(resolvedItems)
      const orderStateId = resolveOrderStateId(row.etat, config)

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
          id_shop: config.shopId
        })
      }

      if (orderStateId) {
        await createOrderHistory({
          id_order: orderId,
          id_order_state: orderStateId
        })
      }

      success += 1
    } catch (error) {
      console.log(`Row ${index + 1}: ${error.message}`)
    }
  }

  return {
    total: rows.length,
    success
  }
}

async function ensureCategoryId(name) {
  if (!name) {
    return DEFAULT_CATEGORY_ID
  }
  const existingId = await findCategoryIdByName(name)
  if (existingId) {
    return existingId
  }
  const newId = await createCategory(
    {
      name,
      parentId: DEFAULT_CATEGORY_ID,
      description: '',
      linkRewrite: slugify(name)
    },
    DEFAULT_LANG_ID
  )
  return newId
}

function toIsoDate(raw) {
  if (!raw) {
    return ''
  }
  const parts = raw.split('/')
  if (parts.length !== 3) {
    return ''
  }
  const [day, month, year] = parts
  if (!day || !month || !year) {
    return ''
  }
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function getReferenceFromFilename(filename) {
  const lastDot = filename.lastIndexOf('.')
  const base = lastDot === -1 ? filename : filename.slice(0, lastDot)
  return base.trim()
}

function parseOrderItems(raw) {
  if (!raw) {
    return []
  }
  const normalized = raw.replace(/""/g, '"')
  const items = []
  const pattern = /\("([^"]*)"\s*;\s*([0-9]+)\s*;\s*"([^"]*)"\)/g
  let match = null

  while ((match = pattern.exec(normalized)) !== null) {
    items.push({
      reference: match[1],
      quantity: toInt(match[2], 0),
      karazany: match[3]
    })
  }

  return items
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
    let price = info.price
    if (item.karazany) {
      const combination = await findCombinationForKarazany(info.id, item.karazany)
      if (combination) {
        productAttributeId = combination.id
        price = info.price + combination.priceImpact
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
  if (!config.currencyId) {
    throw new Error('Missing VITE_DEFAULT_CURRENCY_ID')
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
        cart_row: items.map((item) => ({
          id_product: item.id,
          id_product_attribute: item.productAttributeId || 0,
          id_address_delivery: addressId,
          quantity: item.quantity
        }))
      }
    }
  })
}

async function ensureProductOptionId(name, cache) {
  const normalized = name.trim()
  if (!normalized) {
    throw new Error('Missing specificite')
  }
  if (cache.has(normalized)) {
    return cache.get(normalized)
  }
  const existingId = await findProductOptionIdByName(normalized)
  if (existingId) {
    cache.set(normalized, existingId)
    return existingId
  }
  const id = await createProductOption({ name: normalized })
  cache.set(normalized, id)
  return id
}

async function ensureProductOptionValueId(groupId, name, cache) {
  const normalized = name.trim()
  const key = `${groupId}:${normalized}`
  if (cache.has(key)) {
    return cache.get(key)
  }
  const existingId = await findProductOptionValueIdByName(normalized, groupId)
  if (existingId) {
    cache.set(key, existingId)
    return existingId
  }
  const id = await createProductOptionValue({ groupId, name: normalized })
  cache.set(key, id)
  return id
}

async function ensureCombinationId(productInfo, valueId, reference, karazany, salePrice, cache) {
  const key = `${productInfo.id}:${valueId}`
  if (cache.has(key)) {
    return cache.get(key)
  }
  const existing = await findCombinationByProductAndValueId(productInfo.id, valueId)
  if (existing) {
    cache.set(key, existing.id)
    return existing.id
  }
  const priceImpact = formatMoney(salePrice - productInfo.price)
  const combinationReference = `${reference}-${slugify(karazany)}`
  const id = await createCombinationForProduct({
    productId: productInfo.id,
    valueIds: [valueId],
    reference: combinationReference,
    priceImpact
  })
  cache.set(key, id)
  return id
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

async function getProductInfoByReference(reference, cache) {
  if (cache.has(reference)) {
    return cache.get(reference)
  }
  const info = await findProductInfoByReference(reference)
  if (info) {
    cache.set(reference, info)
  }
  return info
}

function getSpecificite(row) {
  const raw = row.specificite || row.specificit || row.specificite_ || ''
  return String(raw || '').trim()
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

function resolveOrderStateId(status, config) {
  const normalized = normalizeStatus(status)
  if (normalized.includes('accepte')) {
    return config.orderStatePaidId
  }
  if (normalized.includes('erreur')) {
    return config.orderStateErrorId
  }
  return config.orderStatePendingId
}

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getOrderConfig() {
  return {
    langId: toInt(import.meta.env.VITE_DEFAULT_LANG_ID || DEFAULT_LANG_ID, DEFAULT_LANG_ID),
    shopId: toInt(import.meta.env.VITE_DEFAULT_SHOP_ID || '1', 1),
    shopGroupId: toInt(import.meta.env.VITE_DEFAULT_SHOP_GROUP_ID || '1', 1),
    currencyId: toInt(import.meta.env.VITE_DEFAULT_CURRENCY_ID || '1', 1),
    countryId: toInt(import.meta.env.VITE_DEFAULT_COUNTRY_ID || '0', 0),
    stateId: toInt(import.meta.env.VITE_DEFAULT_STATE_ID || '0', 0),
    customerGroupId: toInt(import.meta.env.VITE_DEFAULT_CUSTOMER_GROUP_ID || '3', 3),
    carrierId: toInt(import.meta.env.VITE_DEFAULT_CARRIER_ID || '0', 0),
    defaultCity: (import.meta.env.VITE_DEFAULT_CITY || 'City').trim(),
    defaultPostcode: (import.meta.env.VITE_DEFAULT_POSTCODE || '00000').trim(),
    cashModule: (import.meta.env.VITE_CASH_MODULE || 'ps_cashondelivery').trim(),
    orderStatePendingId: toInt(import.meta.env.VITE_ORDER_STATE_PENDING_ID || '0', 0),
    orderStatePaidId: toInt(import.meta.env.VITE_ORDER_STATE_PAID_ID || '0', 0),
    orderStateErrorId: toInt(import.meta.env.VITE_ORDER_STATE_ERROR_ID || '0', 0)
  }
}

function validateOrderConfig(config) {
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
  if (!config.orderStatePendingId) {
    throw new Error('Missing VITE_ORDER_STATE_PENDING_ID')
  }
}

async function fetchCustomerSecureKey(customerId) {
  const xml = await getXml(`customers/${customerId}`)
  const doc = parseXml(xml)
  return getText(doc, 'secure_key')
}

function verifyLists(target) {
  if (target === 'products') {
    listProductIds()
      .then((ids) => console.log(`Products count: ${ids.length}`))
      .catch((error) => console.log(error.message))
    listCategoryIds()
      .then((ids) => console.log(`Categories count: ${ids.length}`))
      .catch((error) => console.log(error.message))
    return
  }
  if (target === 'stocks') {
    listStockAvailableIds()
      .then((ids) => console.log(`Stocks count: ${ids.length}`))
      .catch((error) => console.log(error.message))
  }
}
