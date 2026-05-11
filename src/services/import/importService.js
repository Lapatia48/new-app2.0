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
import { buildOrderConfig, createOrderFromCsvRow, validateOrderConfig } from '@/services/order/commandeAchatService'
import { slugify, toFloat, toInt } from '@/services/utils/stringUtils'

export async function runImport({ target, rows = [], files = [] }) {
  if (target === 'images') {
    return importImages(files)
  }
  if (!Array.isArray(rows)) {
    throw new Error('CSV rows are missing')
  }

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

    const input = {
      name,
      reference,
      price: toFloat(row.prix_ttc || '0', 0),
      wholesalePrice: toFloat(row.prix_achat || '0', 0),
      categoryId,
      availableDate,
      linkRewrite: slugify(name)
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
      await createOrderFromCsvRow(row, config)
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
