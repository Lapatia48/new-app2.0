import { DEFAULT_CATEGORY_ID } from '@/services/constants'
import { fetchOrderFull } from '@/services/dto/GestionCommandeDto'
import { listOrderIds } from '@/services/entities/ordersService'
import { readCategory } from '@/services/entities/categoriesService'
import { readProduct } from '@/services/entities/productsService'
import { buildOrderConfig } from '@/services/order/commandeAchatService'

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

function getLangText(value) {
  if (!value) return null
  if (value._text !== undefined && value._text !== null) {
    return String(value._text)
  }
  if (value.language) {
    const lang = Array.isArray(value.language) ? value.language[0] : value.language
    if (lang && lang._text !== undefined && lang._text !== null) {
      return String(lang._text)
    }
  }
  if (typeof value === 'string') return value
  return null
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(pickText(value) ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toFloat(value, fallback = 0) {
  const normalized = String(pickText(value) ?? '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function ensureArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function normalizeOrderRows(orderObj) {
  const assoc = orderObj?.associations || {}
  const rowsNode = assoc.order_rows?.order_row
  const rawRows = ensureArray(rowsNode)
  if (!rawRows.length) return []

  return rawRows
    .map((row) => {
      const productId = toInt(pickText(row.product_id, row.id_product), 0)
      const productAttributeId = toInt(
        pickText(row.product_attribute_id, row.id_product_attribute),
        0
      )
      const quantity = toInt(pickText(row.product_quantity, row.quantity), 0)
      if (!productId || quantity <= 0) return null
      const unitPriceExcl = toFloat(
        pickText(
          row.unit_price_tax_excl,
          row.product_price,
          row.price,
          row.unit_price_tax_incl
        ),
        0
      )
      const totalExcl = toFloat(
        pickText(row.total_price_tax_excl, row.total_price, row.total_price_tax_incl),
        unitPriceExcl * quantity
      )
      return {
        productId,
        productAttributeId,
        quantity,
        unitPriceExcl,
        totalExcl
      }
    })
    .filter(Boolean)
}

function shouldIncludeOrder(order, config) {
  const stateId = toInt(pickText(order?.current_state), 0)
  const paidId = toInt(config.orderStatePaidId, 0)
  const deliveredId = toInt(config.orderStateDeliveredId, 0)
  const cancelledId = toInt(config.orderStateCancelledId, 0)

  if (paidId || deliveredId) {
    return stateId === paidId || stateId === deliveredId
  }
  if (cancelledId) {
    return stateId !== cancelledId
  }
  return true
}

async function fetchProductCore(productId, cache) {
  if (!productId) return null
  if (cache.has(productId)) return cache.get(productId)
  try {
    const data = await readProduct(productId)
    const product = data?.product || data
    const core = {
      id: productId,
      wholesalePrice: toFloat(pickText(product?.wholesale_price), 0),
      categoryId: toInt(pickText(product?.id_category_default), DEFAULT_CATEGORY_ID)
    }
    cache.set(productId, core)
    return core
  } catch (error) {
    cache.set(productId, null)
    return null
  }
}

async function fetchCategoryName(categoryId, cache) {
  const id = toInt(categoryId, DEFAULT_CATEGORY_ID)
  if (cache.has(id)) return cache.get(id)
  try {
    const data = await readCategory(id)
    const category = data?.category || data
    const name = getLangText(category?.name) || `Categorie #${id}`
    cache.set(id, name)
    return name
  } catch (error) {
    const fallback = `Categorie #${id}`
    cache.set(id, fallback)
    return fallback
  }
}

export async function fetchBackofficeSalesStats() {
  const config = buildOrderConfig()
  const orderIds = await listOrderIds()
  const productCache = new Map()
  const categoryCache = new Map()

  let totalSalesHt = 0
  let totalPurchaseHt = 0

  const byCategory = new Map()

  for (const orderId of orderIds) {
    let data = null
    try {
      data = await fetchOrderFull(orderId)
    } catch (error) {
      data = null
    }
    const order = data?.order || data
    if (!order) {
      continue
    }
    if (!shouldIncludeOrder(order, config)) {
      continue
    }

    const rows = normalizeOrderRows(order)
    if (!rows.length) {
      continue
    }

    for (const row of rows) {
      const sale = Number.isFinite(row.totalExcl) ? row.totalExcl : 0
      totalSalesHt += sale

      const productCore = await fetchProductCore(row.productId, productCache)
      const purchaseUnit = productCore?.wholesalePrice || 0
      const purchaseTotal = purchaseUnit * row.quantity
      totalPurchaseHt += purchaseTotal

      const categoryId = productCore?.categoryId || DEFAULT_CATEGORY_ID
      const categoryName = await fetchCategoryName(categoryId, categoryCache)

      const current = byCategory.get(categoryId) || {
        id: categoryId,
        name: categoryName,
        sales: 0,
        purchase: 0,
        profit: 0
      }

      current.sales += sale
      current.purchase += purchaseTotal
      current.profit = current.sales - current.purchase
      byCategory.set(categoryId, current)
    }
  }

  const categories = Array.from(byCategory.values()).sort((a, b) => b.profit - a.profit)

  return {
    totalSalesHt,
    totalPurchaseHt,
    totalProfit: totalSalesHt - totalPurchaseHt,
    categories
  }
}

export default {
  fetchBackofficeSalesStats
}
