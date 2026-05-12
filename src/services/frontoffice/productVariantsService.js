import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { listCombinationsByProduct } from '@/services/entities/combinationsService'

const valueCache = new Map()
const groupCache = new Map()
const productCache = new Map()

function pickLangText(node, selector) {
  return getText(node, `${selector} > language`) || getText(node, selector)
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function fetchOptionGroup(groupId) {
  const id = toInt(groupId, 0)
  if (!id) {
    return null
  }
  if (groupCache.has(id)) {
    return groupCache.get(id)
  }
  const xml = await getXml(`product_options/${id}`)
  const doc = parseXml(xml)
  const node = doc.querySelector('product_option')
  if (!node) {
    groupCache.set(id, null)
    return null
  }
  const name = pickLangText(node, 'name') || `Groupe #${id}`
  const group = { id, name }
  groupCache.set(id, group)
  return group
}

async function fetchOptionValue(valueId) {
  const id = toInt(valueId, 0)
  if (!id) {
    return null
  }
  if (valueCache.has(id)) {
    return valueCache.get(id)
  }
  const xml = await getXml(`product_option_values/${id}`)
  const doc = parseXml(xml)
  const node = doc.querySelector('product_option_value')
  if (!node) {
    valueCache.set(id, null)
    return null
  }
  const name = pickLangText(node, 'name') || `Valeur #${id}`
  const groupId = toInt(getText(node, 'id_attribute_group'), 0)
  const group = await fetchOptionGroup(groupId)
  const value = {
    id,
    name,
    groupId,
    groupName: group?.name || ''
  }
  valueCache.set(id, value)
  return value
}

export async function listProductVariants(productId) {
  const id = toInt(productId, 0)
  if (!id) {
    return []
  }
  if (productCache.has(id)) {
    return productCache.get(id)
  }
  const combinations = await listCombinationsByProduct(id)
  const variants = await Promise.all(
    combinations.map(async (combination) => {
      const values = await Promise.all(
        (combination.optionValueIds || []).map((valueId) => fetchOptionValue(valueId))
      )
      const cleaned = values.filter(Boolean)
      if (!cleaned.length) {
        return null
      }
      return {
        id: combination.id,
        priceImpact: Number(combination.priceImpact) || 0,
        values: cleaned
      }
    })
  )
  const cleaned = variants.filter(Boolean)
  productCache.set(id, cleaned)
  return cleaned
}

export function buildSpecificiteOptions(variants = []) {
  const groupMap = new Map()

  for (const variant of variants) {
    const primary = variant.values?.[0]
    if (!primary) {
      continue
    }
    const groupId = primary.groupId || 0
    const groupName = primary.groupName || 'Specificite'
    const group = groupMap.get(groupId) || { id: groupId, name: groupName, values: [] }
    if (!group.values.find((value) => value.id === primary.id)) {
      group.values.push({
        id: primary.id,
        name: primary.name,
        combinationId: variant.id,
        priceImpact: variant.priceImpact
      })
    }
    groupMap.set(groupId, group)
  }

  return Array.from(groupMap.values())
}

export async function enrichOrderRowsWithVariants(rows = []) {
  const productVariants = new Map()

  return Promise.all(
    rows.map(async (row) => {
      if (!row?.productId || !row?.productAttributeId) {
        return row
      }
      if (!productVariants.has(row.productId)) {
        const variants = await listProductVariants(row.productId)
        productVariants.set(row.productId, variants)
      }
      const variants = productVariants.get(row.productId) || []
      const match = variants.find((variant) => variant.id === row.productAttributeId)
      const primary = match?.values?.[0]
      return {
        ...row,
        specificite: primary?.groupName || row.specificite || '',
        karazany: primary?.name || row.karazany || ''
      }
    })
  )
}
