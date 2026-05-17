import { findProductInfoById, findProductInfoByReference } from '@/services/entities/productsService'
import { findProductOptionIdByName } from '@/services/entities/productOptionsService'
import { findProductOptionValueIdByName } from '@/services/entities/productOptionValuesService'
import { findCombinationByProductAndValueId } from '@/services/entities/combinationsService'
import {
  getStockQuantityByProduct,
  getStockQuantityByProductAndAttribute,
  setQuantityForProduct,
  setQuantityForProductAttribute
} from '@/services/entities/stockAvailablesService'

function normalizeText(value) {
  return String(value || '').trim()
}

function parseQuantity(value) {
  const numeric = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(numeric)) {
    return null
  }
  if (!Number.isInteger(numeric)) {
    return null
  }
  return numeric
}

export async function addStockByReference({ reference, productId, quantity, specificite, karazany }) {
  const normalizedRef = normalizeText(reference)
  const resolvedProductId = Number.parseInt(String(productId ?? ''), 10)
  const hasProductId = Number.isFinite(resolvedProductId) && resolvedProductId > 0

  const parsedQty = parseQuantity(quantity)
  if (!parsedQty || parsedQty <= 0) {
    throw new Error('Quantite invalide.')
  }

  let productInfo = null
  if (hasProductId) {
    productInfo = await findProductInfoById(resolvedProductId)
  }
  if (!productInfo) {
    if (!normalizedRef) {
      throw new Error('Produit manquant.')
    }
    productInfo = await findProductInfoByReference(normalizedRef)
  }
  if (!productInfo) {
    throw new Error('Produit introuvable.')
  }

  const normalizedSpec = normalizeText(specificite)
  const normalizedKarazany = normalizeText(karazany)

  if ((normalizedSpec && !normalizedKarazany) || (!normalizedSpec && normalizedKarazany)) {
    throw new Error('Specificite et karazany doivent etre renseignes ensemble.')
  }

  if (normalizedSpec && normalizedKarazany) {
    const groupId = await findProductOptionIdByName(normalizedSpec)
    if (!groupId) {
      throw new Error('Specificite introuvable.')
    }

    const valueId = await findProductOptionValueIdByName(normalizedKarazany, groupId)
    if (!valueId) {
      throw new Error('Karazany introuvable pour cette specificite.')
    }

    const combination = await findCombinationByProductAndValueId(productInfo.id, valueId)
    if (!combination) {
      throw new Error('Combinaison introuvable pour ce produit.')
    }

    const previousQty = (await getStockQuantityByProductAndAttribute(
      productInfo.id,
      combination.id
    )) ?? 0
    const nextQty = previousQty + parsedQty

    await setQuantityForProductAttribute(productInfo.id, combination.id, nextQty)

    return {
      product: productInfo,
      productAttributeId: combination.id,
      previousQty,
      nextQty,
      quantity: parsedQty,
      specificite: normalizedSpec,
      karazany: normalizedKarazany
    }
  }

  const previousQty = (await getStockQuantityByProduct(productInfo.id)) ?? 0
  const nextQty = previousQty + parsedQty

  await setQuantityForProduct(productInfo.id, nextQty)

  return {
    product: productInfo,
    productAttributeId: 0,
    previousQty,
    nextQty,
    quantity: parsedQty,
    specificite: '',
    karazany: ''
  }
}
