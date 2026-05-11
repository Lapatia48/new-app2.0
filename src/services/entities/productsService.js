import { DEFAULT_CATEGORY_ID, DEFAULT_LANG_ID } from '@/services/constants'
import { deleteXml, getXml, postXml, putXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, extractIdsByTag, getIdFromXml, langField, parseXml, xmlToJson } from '@/services/xml/xmlUtils'
import { slugify } from '@/services/utils/stringUtils'

export function listProductIds() {
  return fetchAllIds('products', 'product')
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

export async function updateProduct(id, data, langId = DEFAULT_LANG_ID) {
  const payload = buildProductPayload({ ...data, id }, langId)
  const xml = buildEntityXml('product', payload)
  await putXml(`products/${id}`, xml)
}

export async function deleteProduct(id) {
  await deleteXml(`products/${id}`, undefined, true)
}

function buildProductPayload(data, langId) {
  const name = data.name?.trim() || ''
  const linkRewrite = data.linkRewrite?.trim() || slugify(name)
  const description = data.description ?? ''
  const descriptionShort = data.descriptionShort ?? ''
  const reference = data.reference ?? ''
  const price = Number.isFinite(Number(data.price)) ? Number(data.price).toFixed(2) : '0.00'
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
