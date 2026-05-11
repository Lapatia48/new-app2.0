import { DEFAULT_CATEGORY_ID, DEFAULT_LANG_ID } from '@/services/constants'
import { createCategory, listCategoryIds } from '@/services/entities/categoriesService'
import { createProduct, findProductIdByReference, listProductIds } from '@/services/entities/productsService'
import { listStockAvailableIds, setQuantityForProduct } from '@/services/entities/stockAvailablesService'
import { slugify, toFloat, toInt } from '@/services/utils/stringUtils'

export async function runImport({ target, rows }) {
  let success = 0

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]

    if (target === 'products') {
      const name = row.name?.trim()
      if (!name) {
        console.log(`Row ${index + 1}: missing product name`)
        continue
      }
      const input = {
        name,
        price: toFloat(row.price || '0', 0),
        reference: row.reference || '',
        categoryId: DEFAULT_CATEGORY_ID,
        linkRewrite: row.link_rewrite || slugify(name)
      }
      const quantity = row.quantity ? toInt(row.quantity, 0) : null

      try {
        const productId = await createProduct(input, DEFAULT_LANG_ID)
        console.log(`Product created: ${productId}`)
        if (quantity !== null) {
          await setQuantityForProduct(productId, quantity)
        }
        success += 1
      } catch (error) {
        console.log(`Row ${index + 1}: ${error.message}`)
      }
    }

    if (target === 'categories') {
      const name = row.name?.trim()
      if (!name) {
        console.log(`Row ${index + 1}: missing category name`)
        continue
      }
      const input = {
        name,
        parentId: row.parent_id ? toInt(row.parent_id, DEFAULT_CATEGORY_ID) : DEFAULT_CATEGORY_ID,
        description: row.description || '',
        linkRewrite: row.link_rewrite || slugify(name)
      }

      try {
        await createCategory(input, DEFAULT_LANG_ID)
        success += 1
      } catch (error) {
        console.log(`Row ${index + 1}: ${error.message}`)
      }
    }

    if (target === 'stocks') {
      let productId = toInt(row.product_id || '', 0)
      const quantity = toInt(row.quantity || '0', 0)
      const reference = row.reference || row.sku || row.ref || ''

      if (!productId && reference) {
        productId = await findProductIdByReference(reference)
      }

      if (!productId) {
        console.log(`Row ${index + 1}: missing product_id or reference`) 
        continue
      }

      try {
        await setQuantityForProduct(productId, quantity)
        success += 1
      } catch (error) {
        console.log(`Row ${index + 1}: ${error.message}`)
      }
    }
  }

  verifyLists(target)

  return {
    total: rows.length,
    success
  }
}

function verifyLists(target) {
  if (target === 'products') {
    listProductIds()
      .then((ids) => console.log(`Products count: ${ids.length}`))
      .catch((error) => console.log(error.message))
    return
  }
  if (target === 'categories') {
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
