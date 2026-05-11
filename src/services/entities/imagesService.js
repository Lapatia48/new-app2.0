import { buildApiUrl } from '@/services/http/prestashopClient'

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
