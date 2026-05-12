import { buildApiUrl, getXml } from '@/services/http/prestashopClient'
import { parseXml } from '@/services/xml/xmlUtils'

export async function uploadProductImage(productId, file) {
  const url = buildApiUrl(`images/products/${productId}`)
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`PrestaShop image error ${response.status}: ${text}`)
  }

  return text
}

export async function afficherImageProduct(productId) {
  if (!productId) {
    return null
  }
  const xml = await getXml(`images/products/${productId}`)
  const doc = parseXml(xml)
  const imageNode = doc.querySelector('image')
  if (!imageNode) {
    return null
  }

  const declinationNode = imageNode.querySelector('declination')
  const declinationId = declinationNode?.getAttribute('id') || declinationNode?.querySelector('id')?.textContent
  if (declinationId) {
    return buildApiUrl(`images/products/${productId}/${declinationId}`)
  }

  const imageId = imageNode.getAttribute('id') || imageNode.querySelector('id')?.textContent
  return imageId ? buildApiUrl(`images/products/${productId}/${imageId}`) : null
}

export async function enrichRowsWithProductImages(rows = []) {
  const imageCache = new Map()

  return Promise.all(
    rows.map(async (row) => {
      if (!row?.productId) {
        return row
      }

      if (imageCache.has(row.productId)) {
        return { ...row, imageUrl: imageCache.get(row.productId) || row.imageUrl || null }
      }

      const imageUrl = await afficherImageProduct(row.productId)
      imageCache.set(row.productId, imageUrl)
      return { ...row, imageUrl: imageUrl || row.imageUrl || null }
    })
  )
}
