import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { toInt } from '@/services/utils/stringUtils'

export async function findDefaultEmployeeId() {
  const xml = await getXml('employees', {
    display: '[id]',
    sort: '[id_ASC]',
    limit: '0,1'
  })
  const doc = parseXml(xml)
  const node = doc.querySelector('employee')
  if (!node) {
    return null
  }
  const id = toInt(node.getAttribute('id') || getText(node, 'id'), 0)
  return id || null
}
