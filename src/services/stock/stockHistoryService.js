import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { listStockMovements, createStockMovement } from '@/services/entities/stockMovementsService'
import { createStockEntry, findStockEntry, readStockEntry } from '@/services/entities/stocksService'
import { findStockMovementReasonId } from '@/services/entities/stockMovementReasonsService'
import { findDefaultEmployeeId } from '@/services/entities/employeesService'
import { findProductInfoById } from '@/services/entities/productsService'
import {
  getStockQuantityByProduct,
  getStockQuantityByProductAndAttribute
} from '@/services/entities/stockAvailablesService'
import { toFloat, toInt } from '@/services/utils/stringUtils'

const DEFAULT_EMPLOYEE_ID = toInt(import.meta.env.VITE_DEFAULT_EMPLOYEE_ID || '0', 0)
const DEFAULT_WAREHOUSE_ID = toInt(import.meta.env.VITE_DEFAULT_WAREHOUSE_ID || '0', 0)
const DEFAULT_STOCK_ID = toInt(import.meta.env.VITE_DEFAULT_STOCK_ID || '0', 0)

let cachedEmployeeId = null
const cachedReasonIds = {
  inc: null,
  dec: null
}
const cachedFallbackStockIds = new Map()

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  ].join(' ')
}

async function resolveEmployeeId() {
  if (DEFAULT_EMPLOYEE_ID) {
    return DEFAULT_EMPLOYEE_ID
  }
  if (cachedEmployeeId) {
    return cachedEmployeeId
  }
  const id = await findDefaultEmployeeId()
  if (!id) {
    throw new Error('Aucun employe disponible pour enregistrer le mouvement.')
  }
  cachedEmployeeId = id
  return id
}

async function fetchConfigurationValue(name) {
  try {
    const xml = await getXml('configurations', {
      display: '[value]',
      'filter[name]': name
    })
    const doc = parseXml(xml)
    const node = doc.querySelector('configuration')
    if (!node) {
      return null
    }
    const raw = getText(node, 'value')
    return raw ? raw.trim() : null
  } catch (error) {
    return null
  }
}

async function resolveReasonId(sign) {
  const cacheKey = sign >= 0 ? 'inc' : 'dec'
  if (cachedReasonIds[cacheKey]) {
    return cachedReasonIds[cacheKey]
  }
  const configKey = sign >= 0 ? 'PS_STOCK_MVT_INC_REASON_DEFAULT' : 'PS_STOCK_MVT_DEC_REASON_DEFAULT'
  const configValue = await fetchConfigurationValue(configKey)
  const configId = toInt(configValue || '0', 0)
  if (configId) {
    cachedReasonIds[cacheKey] = configId
    return configId
  }
  const reasonId = await findStockMovementReasonId(sign >= 0 ? 1 : -1)
  if (!reasonId) {
    throw new Error('Aucune raison de mouvement stock disponible.')
  }
  cachedReasonIds[cacheKey] = reasonId
  return reasonId
}

async function resolveFallbackStockEntry(productId, productAttributeId) {
  const normalizedProductId = toInt(productId, 0)
  const normalizedAttributeId = toInt(productAttributeId, 0)
  if (DEFAULT_STOCK_ID) {
    try {
      const entry = await readStockEntry(DEFAULT_STOCK_ID)
      if (
        entry &&
        entry.productId === normalizedProductId &&
        entry.productAttributeId === normalizedAttributeId
      ) {
        return entry
      }
    } catch (error) {
      // Ignore and try other fallbacks.
    }
  }

  const cacheKey = `${normalizedProductId}:${normalizedAttributeId}`
  if (cachedFallbackStockIds.has(cacheKey)) {
    return cachedFallbackStockIds.get(cacheKey)
  }

  try {
    const movements = await listStockMovements({ limit: 200 })
    const match = movements.find(
      (entry) => entry.idProduct === normalizedProductId && entry.idProductAttribute === normalizedAttributeId
    )
    if (match?.idStock) {
      const fallback = {
        id: match.idStock,
        productId: normalizedProductId,
        productAttributeId: normalizedAttributeId,
        warehouseId: DEFAULT_WAREHOUSE_ID,
        priceTe: Number.isFinite(match.priceTe) ? match.priceTe : Number.NaN
      }
      cachedFallbackStockIds.set(cacheKey, fallback)
      return fallback
    }
  } catch (error) {
    return null
  }

  return null
}

async function resolveStockEntry(productId, productAttributeId) {
  if (!DEFAULT_WAREHOUSE_ID) {
    throw new Error('Missing VITE_DEFAULT_WAREHOUSE_ID')
  }
  let entry = null
  try {
    entry = await findStockEntry({
      productId,
      productAttributeId,
      warehouseId: DEFAULT_WAREHOUSE_ID
    })
  } catch (error) {
    entry = null
  }
  if (!entry) {
    try {
      entry = await findStockEntry({
        productId,
        productAttributeId
      })
    } catch (error) {
      entry = null
    }
  }
  if (!entry) {
    entry = await resolveFallbackStockEntry(productId, productAttributeId)
  }
  if (!entry) {
    throw new Error(
      'Stock introuvable pour le produit. Configurez VITE_DEFAULT_STOCK_ID ou l\'entrepot par defaut.'
    )
  }
  return entry
}

async function createStockEntryForProduct({ productId, productAttributeId, priceTe } = {}) {
  if (!DEFAULT_WAREHOUSE_ID) {
    throw new Error('Missing VITE_DEFAULT_WAREHOUSE_ID')
  }
  const normalizedProductId = toInt(productId, 0)
  const normalizedAttributeId = toInt(productAttributeId, 0)
  if (!normalizedProductId) {
    throw new Error('Produit introuvable.')
  }

  const productInfo = await findProductInfoById(normalizedProductId)
  if (!productInfo) {
    throw new Error('Produit introuvable.')
  }

  const currentQty = normalizedAttributeId
    ? await getStockQuantityByProductAndAttribute(normalizedProductId, normalizedAttributeId)
    : await getStockQuantityByProduct(normalizedProductId)

  const resolvedQty = Number.isFinite(Number(currentQty)) ? toInt(currentQty, 0) : 0
  const resolvedPriceTe = Number.isFinite(Number(priceTe))
    ? toFloat(String(priceTe), 0)
    : Number.isFinite(Number(productInfo.price))
      ? toFloat(String(productInfo.price), 0)
      : 0

  const id = await createStockEntry({
    warehouseId: DEFAULT_WAREHOUSE_ID,
    productId: normalizedProductId,
    productAttributeId: normalizedAttributeId,
    reference: productInfo.reference || '',
    physicalQuantity: resolvedQty,
    usableQuantity: resolvedQty,
    priceTe: resolvedPriceTe
  })

  return {
    id,
    productId: normalizedProductId,
    productAttributeId: normalizedAttributeId,
    warehouseId: DEFAULT_WAREHOUSE_ID,
    priceTe: resolvedPriceTe
  }
}

export async function recordStockMovement({
  productId,
  productAttributeId = 0,
  delta,
  priceTe,
  stockId
}) {
  const numericDelta = Number(delta)
  if (!Number.isFinite(numericDelta) || numericDelta === 0) {
    throw new Error('Delta stock invalide.')
  }
  if (!Number.isInteger(numericDelta)) {
    throw new Error('Quantite de mouvement invalide.')
  }
  const quantity = Math.abs(numericDelta)
  if (!quantity) {
    throw new Error('Quantite de mouvement invalide.')
  }

  const sign = numericDelta >= 0 ? 1 : -1
  const overrideStockId = toInt(stockId, 0)
  let stockEntry = null
  if (overrideStockId) {
    stockEntry = {
      id: overrideStockId,
      productId,
      productAttributeId,
      warehouseId: DEFAULT_WAREHOUSE_ID,
      priceTe: Number.NaN
    }
  }
  if (!stockEntry) {
    try {
      stockEntry = await resolveStockEntry(productId, productAttributeId)
    } catch (error) {
      stockEntry = null
    }
  }
  if (!stockEntry) {
    stockEntry = await createStockEntryForProduct({
      productId,
      productAttributeId,
      priceTe
    })
  }
  if (!stockEntry) {
    throw new Error('Stock introuvable pour le produit.')
  }
  const employeeId = await resolveEmployeeId()
  const reasonId = await resolveReasonId(sign)
  const resolvedPriceTe = Number.isFinite(stockEntry.priceTe)
    ? stockEntry.priceTe
    : Number.isFinite(Number(priceTe))
      ? toFloat(String(priceTe), 0)
      : 0

  const payload = {
    id_stock: stockEntry.id,
    id_employee: employeeId,
    id_stock_mvt_reason: reasonId,
    physical_quantity: quantity,
    sign,
    price_te: resolvedPriceTe,
    date_add: formatDateTime(new Date())
  }

  const id = await createStockMovement(payload)
  return {
    id,
    delta: numericDelta,
    stockId: stockEntry.id
  }
}

export async function listStockHistory({ stockId, productId, productAttributeId, date } = {}) {
  const normalizedStockId = toInt(stockId, 0)
  if (normalizedStockId) {
    return listStockMovements({
      stockId: normalizedStockId,
      date
    })
  }
  if (!productId) {
    return []
  }
  const stockEntry = await resolveStockEntry(productId, productAttributeId)
  const entries = await listStockMovements({
    stockId: stockEntry?.id,
    date
  })
  const normalizedAttributeId = toInt(productAttributeId, 0)
  return entries.filter((entry) => {
    if (entry.idProduct !== toInt(productId, 0)) {
      return false
    }
    if (!normalizedAttributeId) {
      return entry.idProductAttribute === 0
    }
    return entry.idProductAttribute === normalizedAttributeId
  })
}

export function buildDailyStockSummary(entries) {
  const sorted = [...entries].sort((a, b) => {
    const aTime = Date.parse(a.timestamp)
    const bTime = Date.parse(b.timestamp)
    return aTime - bTime
  })

  const map = new Map()

  sorted.forEach((entry) => {
    const key = entry.date || 'Sans date'
    const existing = map.get(key)

    if (!existing) {
      map.set(key, {
        date: key,
        events: 1,
        delta: entry.delta || 0,
        startQty: entry.previousQty ?? null,
        endQty: entry.nextQty ?? null
      })
      return
    }

    existing.events += 1
    existing.delta += entry.delta || 0
    if (entry.previousQty !== undefined && entry.previousQty !== null && existing.startQty === null) {
      existing.startQty = entry.previousQty
    }
    if (entry.nextQty !== undefined && entry.nextQty !== null) {
      existing.endQty = entry.nextQty
    }
    map.set(key, existing)
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.date === 'Sans date') return 1
    if (b.date === 'Sans date') return -1
    return a.date < b.date ? 1 : -1
  })
}
