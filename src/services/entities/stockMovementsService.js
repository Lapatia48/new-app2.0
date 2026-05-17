import { deleteXml, getXml, postXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, getIdFromXml, parseXml, getText } from '@/services/xml/xmlUtils'
import { toFloat, toInt } from '@/services/utils/stringUtils'

function normalizeDateInput(value) {
  if (!value) {
    return ''
  }
  return String(value).trim()
}

function matchesDateFilter(entry, { date, fromDate, toDate } = {}) {
  const normalizedDate = normalizeDateInput(date)
  const normalizedFrom = normalizeDateInput(fromDate)
  const normalizedTo = normalizeDateInput(toDate)

  if (!normalizedDate && !normalizedFrom && !normalizedTo) {
    return true
  }

  if (normalizedDate) {
    return entry?.date === normalizedDate
  }

  const timestamp = entry?.timestamp ? Date.parse(entry.timestamp) : Number.NaN
  if (!Number.isFinite(timestamp)) {
    return false
  }

  const start = normalizedFrom ? Date.parse(`${normalizedFrom} 00:00:00`) : Number.NEGATIVE_INFINITY
  const end = normalizedTo ? Date.parse(`${normalizedTo} 23:59:59`) : Number.POSITIVE_INFINITY
  return timestamp >= start && timestamp <= end
}

function parseStockMovementNode(node) {
  const timestamp = getText(node, 'date_add')
  const sign = toInt(getText(node, 'sign'), 0)
  const physicalQuantity = toInt(getText(node, 'physical_quantity'), 0)
  const delta = sign ? sign * physicalQuantity : physicalQuantity

  return {
    id: toInt(node.getAttribute('id') || getText(node, 'id'), 0),
    timestamp,
    date: timestamp ? timestamp.slice(0, 10) : '',
    time: timestamp ? timestamp.slice(11, 16) : '',
    physicalQuantity,
    sign,
    delta,
    idStockMvtReason: toInt(getText(node, 'id_stock_mvt_reason'), 0),
    idEmployee: toInt(getText(node, 'id_employee'), 0),
    idStock: toInt(getText(node, 'id_stock'), 0),
    idProduct: toInt(getText(node, 'id_product'), 0),
    idProductAttribute: toInt(getText(node, 'id_product_attribute'), 0),
    reference: getText(node, 'reference'),
    productName: getText(node, 'product_name'),
    priceTe: toFloat(getText(node, 'price_te') || '0', 0)
  }
}

export async function listStockMovements({
  stockId,
  productId,
  productAttributeId,
  date,
  fromDate,
  toDate,
  limit = 200
} = {}) {
  const query = {
    display: 'full',
    limit: `0,${limit}`
  }

  if (stockId) {
    query['filter[id_stock]'] = stockId
  }

  const xml = await getXml('stock_movements', query)
  const doc = parseXml(xml)
  const nodes = Array.from(doc.querySelectorAll('stock_mvt, stock_movement'))

  return nodes
    .map(parseStockMovementNode)
    .filter((entry) => entry.id)
    .filter((entry) => matchesDateFilter(entry, { date, fromDate, toDate }))
}

export function listStockMovementIds() {
  return fetchAllIds('stock_movements', 'stock_mvt')
}

export async function deleteStockMovement(id) {
  await deleteXml(`stock_movements/${id}`, undefined, true)
}

export async function createStockMovement(payload) {
  const xml = buildEntityXml('stock_movement', payload)
  const responseXml = await postXml('stock_movements', xml)
  const id = getIdFromXml(responseXml, 'stock_mvt') || getIdFromXml(responseXml, 'stock_movement')
  if (!id) {
    throw new Error('Missing stock movement id in response')
  }
  return id
}
