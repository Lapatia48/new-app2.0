import { DEFAULT_CATEGORY_ID, DEFAULT_LANG_ID } from '@/services/constants'
import { deleteXml, getXml, postXml, putXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, extractIdsByTag, getIdFromXml, getText, langField, parseXml, xmlToJson } from '@/services/xml/xmlUtils'
import { slugify, toInt } from '@/services/utils/stringUtils'

export function listProductIds() {
  return fetchAllIds('products', 'product')
}

export async function listProducts(limit = 200) {
  const cappedLimit = Math.min(Math.max(limit, 1), 1000)
  const xml = await getXml('products', {
    display: '[id,reference,name]',
    limit: `0,${cappedLimit}`
  })
  return parseProductSearchResults(xml)
}

export async function readProduct(id) {
  const xml = await getXml(`products/${id}`)
  return xmlToJson(xml)
}

export async function createProduct(data, langId = DEFAULT_LANG_ID) {
  const payload = buildProductPayload(data, langId)
  const xml = buildEntityXml('product', payload)
  const responseXml = await postXml('products', xml)
  const id = getIdFromXml(responseXml, 'product')
  if (!id) {
    throw new Error('Missing product id in response')
  }
  return id
}

export async function findProductIdByReference(reference) {
  if (!reference) {
    return null
  }
  const xml = await getXml('products', {
    display: '[id]',
    'filter[reference]': reference
  })
  const doc = parseXml(xml)
  const ids = extractIdsByTag(doc, 'product')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  return ids[0] ?? null
}

export async function findProductInfoByReference(reference) {
  if (!reference) {
    return null
  }
  const xml = await getXml('products', {
    display: '[id,reference,price,name]',
    'filter[reference]': reference
  })
  const doc = parseXml(xml)
  const node = doc.querySelector('product')
  if (!node) {
    return null
  }
  const id = Number.parseInt(node.getAttribute('id') || getText(node, 'id'), 10)
  if (!Number.isFinite(id)) {
    return null
  }
  const name = getText(node, 'name')
  const rawPrice = getText(node, 'price') || '0'
  // Try to read a tax-included price if available in the node (price_ttc or price_tax_incl)
  const rawPriceTtc = getText(node, 'price_ttc') || getText(node, 'price_tax_incl') || ''
  const price = Number.parseFloat(rawPrice || '0')
  const priceTtc = rawPriceTtc ? Number.parseFloat(rawPriceTtc) : Number.NaN
  return {
    id,
    name,
    price: Number.isFinite(price) ? price : 0,
    priceTtc: Number.isFinite(priceTtc) ? priceTtc : null
  }
}

export async function findProductInfoById(productId) {
  const id = Number.parseInt(String(productId ?? ''), 10)
  if (!Number.isFinite(id) || !id) {
    return null
  }
  const xml = await getXml('products', {
    display: '[id,reference,price,name]',
    'filter[id]': id
  })
  const doc = parseXml(xml)
  const node = doc.querySelector('product')
  if (!node) {
    return null
  }
  const resolvedId = Number.parseInt(node.getAttribute('id') || getText(node, 'id'), 10)
  if (!Number.isFinite(resolvedId)) {
    return null
  }
  const name = getText(node, 'name')
  const reference = getText(node, 'reference')
  const price = Number.parseFloat(getText(node, 'price') || '0')
  const rawPriceTtc = getText(node, 'price_ttc') || getText(node, 'price_tax_incl') || ''
  const priceTtc = rawPriceTtc ? Number.parseFloat(rawPriceTtc) : Number.NaN
  return {
    id: resolvedId,
    name,
    reference,
    price: Number.isFinite(price) ? price : 0,
    priceTtc: Number.isFinite(priceTtc) ? priceTtc : null
  }
}

export async function updateProduct(id, data, langId = DEFAULT_LANG_ID) {
  const payload = buildProductPayload({ ...data, id }, langId)
  const xml = buildEntityXml('product', payload)
  await putXml(`products/${id}`, xml)
}

export async function deleteProduct(id) {
  await deleteXml(`products/${id}`, undefined, true)
}

function parseProductSearchResults(xml) {
  const doc = parseXml(xml)
  const nodes = Array.from(doc.querySelectorAll('product'))
  return nodes
    .map((node) => {
      const id = toInt(node.getAttribute('id') || getText(node, 'id'), 0)
      if (!id) {
        return null
      }
      return {
        id,
        reference: getText(node, 'reference'),
        name: getText(node, 'name')
      }
    })
    .filter(Boolean)
}

export async function searchProducts(query, limit = 12) {
  const term = String(query || '').trim()
  if (!term) {
    return []
  }

  const cappedLimit = Math.min(Math.max(limit, 1), 50)
  const display = '[id,reference,name]'
  const likeTerm = `%${term}%`

  const requests = [
    getXml('products', {
      display,
      limit: `0,${cappedLimit}`,
      'filter[reference]': likeTerm
    }),
    getXml('products', {
      display,
      limit: `0,${cappedLimit}`,
      'filter[name]': likeTerm
    })
  ]

  if (/^\d+$/.test(term)) {
    requests.push(
      getXml('products', {
        display,
        limit: `0,${cappedLimit}`,
        'filter[id]': term
      })
    )
  }

  const results = await Promise.allSettled(requests)
  const map = new Map()

  results.forEach((result) => {
    if (result.status !== 'fulfilled' || !result.value) {
      return
    }
    parseProductSearchResults(result.value).forEach((product) => {
      if (!map.has(product.id)) {
        map.set(product.id, product)
      }
    })
  })

  return Array.from(map.values())
}

function buildProductPayload(data, langId) {
  const name = data.name?.trim() || ''
  const linkRewrite = data.linkRewrite?.trim() || slugify(name)
  const description = data.description ?? ''
  const descriptionShort = data.descriptionShort ?? ''
  const reference = data.reference ?? ''
  const price = Number.isFinite(Number(data.price)) ? Number(data.price).toFixed(2) : '0.00'
  const wholesalePrice = Number.isFinite(Number(data.wholesalePrice))
    ? Number(data.wholesalePrice).toFixed(2)
    : undefined
  const availableDate = data.availableDate ? data.availableDate : undefined
  const active = data.active === false ? 0 : 1
  const categoryId = data.categoryId ?? DEFAULT_CATEGORY_ID
  const minimalQuantity = data.minimalQuantity ?? 1
  const taxRulesGroupId = data.taxRulesGroupId ?? 0

  return {
    id: data.id,
    active,
    price,
    id_category_default: categoryId,
    id_shop_default: 1,
    state: 1,
    visibility: 'both',
    indexed: 1,
    name: langField(name, langId),
    link_rewrite: langField(linkRewrite, langId),
    description: langField(description, langId),
    description_short: langField(descriptionShort, langId),
    reference,
    wholesale_price: wholesalePrice,
    available_date: availableDate,
    minimal_quantity: minimalQuantity,
    show_price: 1,
    available_for_order: 1,
    id_tax_rules_group: taxRulesGroupId,
    associations: {
      categories: {
        category: {
          id: categoryId
        }
      }
    }
  }
}
