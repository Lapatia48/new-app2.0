import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { toInt } from '@/services/utils/stringUtils'

export async function listStockMovementReasons({ sign, limit = 10000 } = {}) {
  const query = {
    display: '[id,sign,name]',
    limit: `0,${Math.min(Math.max(limit, 1), 10000)}`
  }

  if (typeof sign === 'number') {
    query['filter[sign]'] = sign
  }

  const xml = await getXml('stock_movement_reasons', query)
  const doc = parseXml(xml)
  const nodes = Array.from(doc.querySelectorAll('stock_movement_reason'))

  return nodes
    .map((node) => {
      const id = toInt(node.getAttribute('id') || getText(node, 'id'), 0)
      if (!id) {
        return null
      }
      return {
        id,
        sign: toInt(getText(node, 'sign'), 0),
        name: getText(node, 'name')
      }
    })
    .filter(Boolean)
}

export async function findStockMovementReasonId(sign = 1) {
  const reasons = await listStockMovementReasons({ sign, limit: 1 })
  return reasons[0]?.id || null
}
