import { deleteXml, getXml, postXml, putXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, getIdFromXml, xmlToJson, extractIdsByTag, parseXml } from '@/services/xml/xmlUtils'
import { toInt } from '@/services/utils/stringUtils'

export function listStockAvailableIds() {
  return fetchAllIds('stock_availables', 'stock_available')
}

export async function readStockAvailable(id) {
  const xml = await getXml(`stock_availables/${id}`)
  return xmlToJson(xml)
}

export async function createStockAvailable(data) {
  const xml = buildEntityXml('stock_available', data)
  const responseXml = await postXml('stock_availables', xml)
  const id = getIdFromXml(responseXml, 'stock_available')
  if (!id) {
    throw new Error('Missing stock_available id in response')
  }
  return id
}

export async function updateStockAvailable(id, data) {
  const xml = buildEntityXml('stock_available', { ...data, id })
  await putXml(`stock_availables/${id}`, xml)
}

export async function deleteStockAvailable(id) {
  await deleteXml(`stock_availables/${id}`, undefined, true)
}

export async function setStockQuantityById(id, quantity) {
  const xml = await getXml(`stock_availables/${id}`)
  const doc = parseXml(xml)
  const node = doc.querySelector('stock_available')
  if (!node) {
    throw new Error('stock_available not found')
  }
  const payload = {
    id,
    id_product: toInt(getText(node, 'id_product'), 0),
    id_product_attribute: toInt(getText(node, 'id_product_attribute'), 0),
    id_shop: toInt(getText(node, 'id_shop'), 0),
    id_shop_group: toInt(getText(node, 'id_shop_group'), 0),
    quantity,
    depends_on_stock: toInt(getText(node, 'depends_on_stock'), 0),
    out_of_stock: toInt(getText(node, 'out_of_stock'), 0)
  }
  await updateStockAvailable(id, payload)
}

export async function findStockIdByProductId(productId) {
  const xml = await getXml('stock_availables', {
    display: '[id]',
    'filter[id_product]': productId
  })
  const doc = parseXml(xml)
  const ids = extractIdsByTag(doc, 'stock_available')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  return ids[0] ?? null
}

export async function findStockIdByProductAndAttribute(productId, productAttributeId) {
  const xml = await getXml('stock_availables', {
    display: '[id]',
    'filter[id_product]': productId,
    'filter[id_product_attribute]': productAttributeId
  })
  const doc = parseXml(xml)
  const ids = extractIdsByTag(doc, 'stock_available')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  return ids[0] ?? null
}

export async function setQuantityForProduct(productId, quantity) {
  const stockId = await findStockIdByProductId(productId)
  if (!stockId) {
    await createStockAvailable({
      id_product: productId,
      id_product_attribute: 0,
      id_shop: 1,
      id_shop_group: 0,
      quantity,
      depends_on_stock: 0,
      out_of_stock: 2
    })
    return
  }
  await setStockQuantityById(stockId, quantity)
}

export async function setQuantityForProductAttribute(productId, productAttributeId, quantity) {
  const stockId = await findStockIdByProductAndAttribute(productId, productAttributeId)
  if (!stockId) {
    await createStockAvailable({
      id_product: productId,
      id_product_attribute: productAttributeId,
      id_shop: 1,
      id_shop_group: 0,
      quantity,
      depends_on_stock: 0,
      out_of_stock: 2
    })
    return
  }
  await setStockQuantityById(stockId, quantity)
}

export async function adjustStockQuantityByProduct(productId, delta) {
  const current = (await getStockQuantityByProduct(productId)) ?? 0
  const nextQty = current + Number(delta || 0)
  await setQuantityForProduct(productId, Math.max(0, nextQty))
  return { previousQty: current, nextQty: Math.max(0, nextQty) }
}

export async function adjustStockQuantityByProductAttribute(
  productId,
  productAttributeId,
  delta
) {
  const current = (await getStockQuantityByProductAndAttribute(productId, productAttributeId)) ?? 0
  const nextQty = current + Number(delta || 0)
  await setQuantityForProductAttribute(productId, productAttributeId, Math.max(0, nextQty))
  return { previousQty: current, nextQty: Math.max(0, nextQty) }
}

function getQuantityFromDoc(doc) {
  const node = doc.querySelector('stock_available')
  if (!node) {
    return null
  }
  const raw = getText(node, 'quantity')
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : null
}

export async function getStockQuantityByProduct(productId) {
  if (!productId) {
    return null
  }
  const xml = await getXml('stock_availables', {
    display: '[quantity]',
    'filter[id_product]': productId,
    'filter[id_product_attribute]': 0
  })
  const doc = parseXml(xml)
  return getQuantityFromDoc(doc)
}

export async function getStockQuantityByProductAndAttribute(productId, productAttributeId) {
  if (!productId || !productAttributeId) {
    return null
  }
  const xml = await getXml('stock_availables', {
    display: '[quantity]',
    'filter[id_product]': productId,
    'filter[id_product_attribute]': productAttributeId
  })
  const doc = parseXml(xml)
  return getQuantityFromDoc(doc)
}

/**
 * Valide que la quantité demandée est disponible en stock
 * @param {number} productId - ID du produit
 * @param {number} requestedQuantity - Quantité demandée
 * @param {number} [productAttributeId] - ID de l'attribut produit (optionnel)
 * @throws {Error} Si le stock est insuffisant
 * @returns {Promise<boolean>} true si le stock est suffisant
 */
export async function validateStockAvailability(productId, requestedQuantity, productAttributeId = 0) {
  const normalizedQty = Number.parseInt(String(requestedQuantity ?? 0), 10)
  
  if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
    throw new Error('Quantité invalide')
  }
  
  const availableStock = productAttributeId
    ? await getStockQuantityByProductAndAttribute(productId, productAttributeId)
    : await getStockQuantityByProduct(productId)
  
  const stockQty = availableStock ?? 0
  
  if (stockQty < normalizedQty) {
    throw new Error(
      `Stock insuffisant. Disponible: ${Math.max(0, stockQty)}, Demandé: ${normalizedQty}`
    )
  }
  
  return true
}

function getText(node, selector, fallback = '') {
  const el = node.querySelector(selector)
  return el && el.textContent ? el.textContent.trim() : fallback
}
