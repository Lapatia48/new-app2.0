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
import { createProductOption, findProductOptionIdByName } from '@/services/entities/productOptionsService'
import { createProductOptionValue, findProductOptionValueIdByName } from '@/services/entities/productOptionValuesService'
import { createCombinationForProduct, findCombinationByProductAndValueId } from '@/services/entities/combinationsService'
import { createTax, findTaxIdByName, findTaxIdByRate } from '@/services/entities/taxesService'
import { createTaxRulesGroup, findTaxRulesGroupIdByName } from '@/services/entities/taxRulesGroupsService'
import { createTaxRule, findTaxRuleIdByGroupAndTax } from '@/services/entities/taxRulesService'
import {
  buildOrderConfig,
  createCartFromCsvRow,
  createOrderFromCsvRow,
  validateOrderConfig
} from '@/services/order/commandeAchatService'
import { slugify, toFloat, toInt } from '@/services/utils/stringUtils'

const IMPORT_SCHEMA = {
  products: {
    required: ['nom', 'reference'],
    allowed: [
      'nom',
      'reference',
      'categorie',
      'date_availability_produit',
      'date_produit',
      'prix_ttc',
      'prix_achat',
      'taxe',
      'tax'
    ],
    dateFields: ['date_availability_produit', 'date_produit'],
    nonNegativeFields: ['prix_ttc', 'prix_achat', 'taxe', 'tax']
  },
  stocks: {
    required: ['reference', 'stock_initial'],
    allowed: [
      'reference',
      'stock_initial',
      'specificite',
      'specificit',
      'specificite_',
      'karazany',
      'prix_vente_ttc'
    ],
    dateFields: [],
    nonNegativeFields: ['stock_initial', 'prix_vente_ttc']
  },
  orders: {
    required: ['achat', 'email'],
    allowed: ['nom', 'email', 'pwd', 'adresse', 'achat', 'etat', 'date'],
    dateFields: ['date'],
    nonNegativeFields: []
  }
}

function throwResetDataError(message) {
  throw new Error(`reset-data: ${message}`)
}

function validateImportPayload(target, rows, meta) {
  if (!target || !IMPORT_SCHEMA[target]) {
    return
  }
  validateImportHeaders(target, meta)
  validateImportRows(target, rows)
}

function validateImportHeaders(target, meta) {
  const normalizedHeaders = Array.isArray(meta?.normalizedHeaders) ? meta.normalizedHeaders : []
  if (!normalizedHeaders.length) {
    return
  }

  const schema = IMPORT_SCHEMA[target]
  const allowed = schema.allowed || []
  const required = schema.required || []
  const invalid = normalizedHeaders.filter((header) => !allowed.includes(header))
  const missing = required.filter((header) => !normalizedHeaders.includes(header))

  if (invalid.length) {
    throwResetDataError(`Nom de colonne non conforme: ${invalid.join(', ')}`)
  }
  if (missing.length) {
    throwResetDataError(`Nom de colonne non conforme: colonnes manquantes ${missing.join(', ')}`)
  }
}

function validateImportRows(target, rows) {
  const schema = IMPORT_SCHEMA[target]
  if (!schema || !Array.isArray(rows)) {
    return
  }

  const dateFields = schema.dateFields || []
  const nonNegativeFields = schema.nonNegativeFields || []

  rows.forEach((row, index) => {
    const rowNumber = index + 2

    dateFields.forEach((field) => {
      const value = row?.[field]
      if (!value) {
        return
      }
      if (!isValidFrenchDate(String(value))) {
        throwResetDataError(
          `Format de date differente de DD/MM/YYYY (colonne ${field}, ligne ${rowNumber})`
        )
      }
    })

    nonNegativeFields.forEach((field) => {
      const value = row?.[field]
      if (value === undefined || value === null || String(value).trim() === '') {
        return
      }
      const numeric = toFloat(String(value), Number.NaN)
      if (Number.isFinite(numeric) && numeric < 0) {
        throwResetDataError(
          `Valeur doit etre positif detecte (colonne ${field}, ligne ${rowNumber})`
        )
      }
    })

    if (target === 'orders') {
      validateAchatQuantities(row?.achat, rowNumber)
    }

    if (target === 'products') {
      const taxValue = row?.taxe ?? row?.tax
      if (String(taxValue ?? '').trim()) {
        const rate = parseTaxRate(taxValue)
        if (rate === null) {
          throwResetDataError(
            `Format taxe invalide (colonne taxe, ligne ${rowNumber})`
          )
        }
      }
    }
  })
}

function isValidFrenchDate(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return false
  }
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) {
    return false
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function validateAchatQuantities(raw, rowNumber) {
  const text = String(raw || '').trim()
  if (!text) {
    return
  }
  const pattern = /\(\s*"[^"]*"\s*;\s*([-+]?\d+)\s*;\s*"[^"]*"\s*\)/g
  let match = pattern.exec(text)
  while (match) {
    const quantity = Number(match[1])
    if (Number.isFinite(quantity) && quantity < 0) {
      throwResetDataError(
        `Montant negatif detecte (colonne achat, ligne ${rowNumber})`
      )
    }
    match = pattern.exec(text)
  }
}

export async function runImport({ target, rows = [], files = [], meta = {} }) {
  if (target === 'images') {
    return importImages(files)
  }
  if (!Array.isArray(rows)) {
    throw new Error('CSV rows are missing')
  }

  validateImportPayload(target, rows, meta)

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
  const taxContext = {
    taxCache: new Map(),
    groupCache: new Map(),
    ruleCache: new Set(),
    config: buildTaxConfig()
  }

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
    const taxRate = parseTaxRate(row.taxe ?? row.tax)
    const taxRulesGroupId = taxRate === null
      ? 0
      : await ensureTaxRulesGroupId(taxRate, taxContext)

    const input = {
      name,
      reference,
      price: toFloat(row.prix_ttc || '0', 0),
      wholesalePrice: toFloat(row.prix_achat || '0', 0),
      categoryId,
      availableDate,
      linkRewrite: slugify(name),
      taxRulesGroupId
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
  const config = buildOrderConfig()
  validateOrderConfig(config)

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    try {
      const status = String(row.etat || '').trim()
      const normalizedStatus = status
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const isCartStatus = !status || normalizedStatus.includes('panier')
      if (isCartStatus) {
        await createCartFromCsvRow(row, config)
      } else {
        await createOrderFromCsvRow(row, config)
      }
      success += 1
    } catch (error) {
      console.log(`Row ${index + 1}: ${error.message}`)
      console.log(error)
    }
  }

  return {
    total: rows.length,
    success
  }
}

function buildTaxConfig() {
  return {
    langId: toInt(import.meta.env.VITE_DEFAULT_LANG_ID || DEFAULT_LANG_ID, DEFAULT_LANG_ID),
    countryId: toInt(import.meta.env.VITE_DEFAULT_COUNTRY_ID || '0', 0),
    stateId: toInt(import.meta.env.VITE_DEFAULT_STATE_ID || '0', 0)
  }
}

function validateTaxConfig(config) {
  if (!config.countryId) {
    throw new Error('Missing VITE_DEFAULT_COUNTRY_ID')
  }
}

async function ensureTaxRulesGroupId(rate, context) {
  const normalizedRate = normalizeTaxRate(rate)
  if (!normalizedRate) {
    return 0
  }
  if (context.groupCache.has(normalizedRate)) {
    return context.groupCache.get(normalizedRate)
  }

  validateTaxConfig(context.config)

  const taxId = await ensureTaxId(rate, context)
  const groupName = buildTaxName(normalizedRate)

  let groupId = await findTaxRulesGroupIdByName(groupName)
  if (!groupId) {
    groupId = await createTaxRulesGroup({ name: groupName, active: 1 })
  }

  const ruleKey = `${groupId}:${taxId}:${context.config.countryId}:${context.config.stateId || 0}`
  if (!context.ruleCache.has(ruleKey)) {
    const existingRuleId = await findTaxRuleIdByGroupAndTax({
      taxRulesGroupId: groupId,
      taxId,
      countryId: context.config.countryId,
      stateId: context.config.stateId
    })

    if (!existingRuleId) {
      await createTaxRule({
        taxRulesGroupId: groupId,
        taxId,
        countryId: context.config.countryId,
        stateId: context.config.stateId,
        behavior: 0,
        description: `Auto import ${normalizedRate}%`
      })
    }

    context.ruleCache.add(ruleKey)
  }

  context.groupCache.set(normalizedRate, groupId)
  return groupId
}

async function ensureTaxId(rate, context) {
  const normalizedRate = normalizeTaxRate(rate)
  if (!normalizedRate) {
    throw new Error('Missing tax rate')
  }
  if (context.taxCache.has(normalizedRate)) {
    return context.taxCache.get(normalizedRate)
  }

  const name = buildTaxName(normalizedRate)
  let taxId = await findTaxIdByRate(normalizedRate)
  if (!taxId) {
    taxId = await findTaxIdByName(name)
  }
  if (!taxId) {
    taxId = await createTax({ name, rate: normalizedRate, active: 1 }, context.config.langId)
  }

  context.taxCache.set(normalizedRate, taxId)
  return taxId
}

function buildTaxName(rate) {
  return `TVA ${rate}%`
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

function parseTaxRate(raw) {
  if (raw === undefined || raw === null) {
    return null
  }
  const text = String(raw).trim()
  if (!text) {
    return null
  }
  const cleaned = text.replace('%', '').trim()
  const numeric = toFloat(cleaned, Number.NaN)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return numeric
}

function normalizeTaxRate(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return numeric.toFixed(2)
}

function formatMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '0.00'
  }
  return numeric.toFixed(2)
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
