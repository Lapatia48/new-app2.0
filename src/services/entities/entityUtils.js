import { getXml } from '@/services/http/prestashopClient'
import { DEFAULT_PAGE_SIZE } from '@/services/constants'
import { extractIdsByTag, parseXml } from '@/services/xml/xmlUtils'

export async function fetchAllIds(resource, itemTag, pageSize = DEFAULT_PAGE_SIZE) {
  const ids = []
  let offset = 0

  while (true) {
    const xml = await getXml(resource, { display: '[id]', limit: `${offset},${pageSize}` })
    const doc = parseXml(xml)
    const batch = extractIdsByTag(doc, itemTag)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value))

    if (!batch.length) {
      break
    }

    ids.push(...batch)

    if (batch.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return ids
}
