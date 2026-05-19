import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'

const productCache = new Map()
const combinationCache = new Map()
const taxRateCache = new Map()

function toFloat(value, fallback = 0) {
  const normalized = String(value ?? '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseTaxRate(name) {
  const raw = String(name || '')
  const match = raw.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) {
    return 0
  }
  return toFloat(match[1], 0)
}

async function fetchProductCore(productId) {
  if (!productId) return null
  if (productCache.has(productId)) return productCache.get(productId)

  try {
    const xml = await getXml(`products/${productId}`, { display: 'full' })
    const doc = parseXml(xml)
    const node = doc.querySelector('product')
    if (!node) {
      productCache.set(productId, null)
      return null
    }
    const price = toFloat(getText(node, 'price'), 0)
    const taxRulesGroupId = toInt(getText(node, 'id_tax_rules_group'), 0)
    const productType = getText(node, 'product_type') || getText(node, 'type') || ''

    const core = {
      id: productId,
      price,
      taxRulesGroupId,
      productType
    }
    productCache.set(productId, core)
    return core
  } catch (error) {
    productCache.set(productId, null)
    return null
  }
}

async function fetchCombinationImpact(combinationId) {
  const id = toInt(combinationId, 0)
  if (!id) return 0
  if (combinationCache.has(id)) return combinationCache.get(id)

  try {
    const xml = await getXml(`combinations/${id}`, { display: 'full' })
    const doc = parseXml(xml)
    const node = doc.querySelector('combination')
    if (!node) {
      combinationCache.set(id, 0)
      return 0
    }
    const impact = toFloat(getText(node, 'price') || getText(node, 'price_impact'), 0)
    combinationCache.set(id, impact)
    return impact
  } catch (error) {
    combinationCache.set(id, 0)
    return 0
  }
}

async function fetchTaxRate(taxRulesGroupId) {
  const id = toInt(taxRulesGroupId, 0)
  if (!id) return 0
  if (taxRateCache.has(id)) return taxRateCache.get(id)

  try {
    const xml = await getXml(`tax_rule_groups/${id}`, { display: 'full' })
    const doc = parseXml(xml)
    const node = doc.querySelector('tax_rule_group')
    const rate = parseTaxRate(getText(node, 'name'))
    taxRateCache.set(id, rate)
    return rate
  } catch (error) {
    taxRateCache.set(id, 0)
    return 0
  }
}

export async function getProductPricing(productId, productAttributeId = 0) {
  const id = toInt(productId, 0)
  if (!id) {
    return null
  }

  const core = await fetchProductCore(id)
  if (!core) {
    return null
  }

  const impact = productAttributeId ? await fetchCombinationImpact(productAttributeId) : 0
  const priceTtc = core.price + impact
  const taxRate = await fetchTaxRate(core.taxRulesGroupId)
  const divisor = 1 + taxRate / 100
  const priceHt = divisor ? priceTtc / divisor : priceTtc

  return {
    productId: id,
    productAttributeId: toInt(productAttributeId, 0),
    priceTtc,
    priceHt,
    taxRate,
    basePrice: core.price,
    priceImpact: impact
  }
}

export default {
  getProductPricing
}
