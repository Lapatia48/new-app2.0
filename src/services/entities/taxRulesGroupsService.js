import { deleteXml, getXml, postXml, putXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, extractIdsByTag, getIdFromXml, parseXml } from '@/services/xml/xmlUtils'

export function listTaxRulesGroupIds() {
  return fetchAllIds('tax_rule_groups', 'tax_rule_group')
}

export async function createTaxRulesGroup(data) {
  const payload = buildTaxRulesGroupPayload(data)
  const xml = buildEntityXml('tax_rules_group', payload)
  const responseXml = await postXml('tax_rule_groups', xml)
  const id = getIdFromXml(responseXml, 'tax_rule_group')
  if (!id) {
    throw new Error('Missing tax rules group id in response')
  }
  return id
}

export async function findTaxRulesGroupIdByName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) {
    return null
  }
  const xml = await getXml('tax_rule_groups', {
    display: '[id]',
    'filter[name]': trimmed
  })
  const doc = parseXml(xml)
  const ids = extractIdsByTag(doc, 'tax_rule_group')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  return ids[0] ?? null
}

export async function updateTaxRulesGroup(id, data) {
  const payload = buildTaxRulesGroupPayload({ ...data, id })
  const xml = buildEntityXml('tax_rules_group', payload)
  await putXml(`tax_rule_groups/${id}`, xml)
}

export async function deleteTaxRulesGroup(id) {
  await deleteXml(`tax_rule_groups/${id}`, undefined, true)
}

function buildTaxRulesGroupPayload(data) {
  const name = String(data.name || '').trim()
  const active = data.active === false ? 0 : 1

  return {
    id: data.id,
    name,
    active
  }
}
