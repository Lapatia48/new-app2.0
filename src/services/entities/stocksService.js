import { deleteXml, getXml, postXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, getIdFromXml, parseXml, getText } from '@/services/xml/xmlUtils'
import { toFloat, toInt } from '@/services/utils/stringUtils'

function parseStockNode(node) {
  if (!node) {
    return null
  }
  const id = toInt(node.getAttribute('id') || getText(node, 'id'), 0)
  if (!id) {
    return null
  }
  return {
    id,
    productId: toInt(getText(node, 'id_product'), 0),
    productAttributeId: toInt(getText(node, 'id_product_attribute'), 0),
    warehouseId: toInt(getText(node, 'id_warehouse'), 0),
    reference: getText(node, 'reference'),
    priceTe: toFloat(getText(node, 'price_te') || '0', 0)
  }
}

export async function listStocks(limit = 10000) {
  const cappedLimit = Math.min(Math.max(limit, 1), 10000)
  const xml = await getXml('stocks', {
    display: '[id,id_warehouse,id_product,id_product_attribute,reference,price_te]',
    limit: `0,${cappedLimit}`
  })
  const doc = parseXml(xml)
  const nodes = Array.from(doc.querySelectorAll('stock'))
  return nodes.map(parseStockNode).filter(Boolean)
}

export function listStockIds() {
  return fetchAllIds('stocks', 'stock')
}

export async function deleteStock(id) {
  await deleteXml(`stocks/${id}`, undefined, true)
}

export async function readStockEntry(id) {
  const stockId = toInt(id, 0)
  if (!stockId) {
    return null
  }
  const xml = await getXml(`stocks/${stockId}`)
  const doc = parseXml(xml)
  const node = doc.querySelector('stock')
  return parseStockNode(node)
}

export async function createStockEntry({
  warehouseId,
  productId,
  productAttributeId = 0,
  reference = '',
  physicalQuantity = 0,
  usableQuantity = 0,
  priceTe = 0,
  ean13 = '',
  isbn = '',
  upc = '',
  mpn = ''
} = {}) {
  const idWarehouse = toInt(warehouseId, 0)
  const idProduct = toInt(productId, 0)
  const idAttribute = toInt(productAttributeId, 0)
  if (!idWarehouse || !idProduct) {
    throw new Error('Missing stock warehouse or product id')
  }

  const payload = {
    id_warehouse: idWarehouse,
    id_product: idProduct,
    id_product_attribute: idAttribute,
    reference,
    ean13,
    isbn,
    upc,
    mpn,
    // Ensure integer quantities are sent to the API (no decimals, no empty values)
    physical_quantity: toInt(physicalQuantity, 0),
    usable_quantity: toInt(usableQuantity, 0),
    price_te: toFloat(String(priceTe ?? '0'), 0)
  }

  const xml = buildEntityXml('stock', payload)
  try {
    const responseXml = await postXml('stocks', xml)
    const id = getIdFromXml(responseXml, 'stock')
    if (!id) {
      throw new Error('Missing stock id in response')
    }
    return id
  } catch (error) {
    // Re-throw with context to help troubleshooting validation errors from PrestaShop
    throw new Error(`Failed to create stock entry (productId=${idProduct}, attribute=${idAttribute}): ${error?.message || error}`)
  }
}

export async function findStockEntry({ productId, productAttributeId = 0, warehouseId } = {}) {
  const idProduct = toInt(productId, 0)
  const idAttribute = toInt(productAttributeId, 0)
  if (!idProduct) {
    return null
  }

  const query = {
    display: '[id,id_warehouse,id_product,id_product_attribute,price_te]',
    'filter[id_product]': idProduct,
    'filter[id_product_attribute]': idAttribute
  }

  if (warehouseId) {
    query['filter[id_warehouse]'] = warehouseId
  }

  try {
    const xml = await getXml('stocks', query)
    const doc = parseXml(xml)
    const node = doc.querySelector('stock')
    const entry = parseStockNode(node)
    if (entry) {
      return entry
    }
  } catch (error) {
    // Fallback to a broader list below.
  }

  const fallbackXml = await getXml('stocks', {
    display: '[id,id_warehouse,id_product,id_product_attribute,price_te]',
    limit: '0,10000'
  })
  const fallbackDoc = parseXml(fallbackXml)
  const nodes = Array.from(fallbackDoc.querySelectorAll('stock'))
  const normalizedWarehouseId = toInt(warehouseId, 0)

  for (const node of nodes) {
    const entry = parseStockNode(node)
    if (!entry) {
      continue
    }
    if (entry.productId !== idProduct || entry.productAttributeId !== idAttribute) {
      continue
    }
    if (normalizedWarehouseId && entry.warehouseId !== normalizedWarehouseId) {
      continue
    }
    return entry
  }

  return null
}
