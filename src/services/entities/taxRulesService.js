import { deleteXml, getXml, postXml, putXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, extractIdsByTag, getIdFromXml, parseXml } from '@/services/xml/xmlUtils'
import { toInt } from '@/services/utils/stringUtils'

export function listTaxRuleIds() {
  return fetchAllIds('tax_rules', 'tax_rule')
}

export async function createTaxRule(data) {
  const payload = buildTaxRulePayload(data)
  const xml = buildEntityXml('tax_rule', payload)
  const responseXml = await postXml('tax_rules', xml)
  const id = getIdFromXml(responseXml, 'tax_rule')
  if (!id) {
    throw new Error('Missing tax rule id in response')
  }
  return id
}

export async function findTaxRuleIdByGroupAndTax({ taxRulesGroupId, taxId, countryId, stateId }) {
  const groupId = toInt(taxRulesGroupId, 0)
  const resolvedTaxId = toInt(taxId, 0)
  const resolvedCountryId = toInt(countryId, 0)
  const resolvedStateId = toInt(stateId, 0)

  if (!groupId || !resolvedTaxId || !resolvedCountryId) {
    return null
  }

  const params = {
    display: '[id]',
    'filter[id_tax_rules_group]': groupId,
    'filter[id_tax]': resolvedTaxId,
    'filter[id_country]': resolvedCountryId
  }

  if (resolvedStateId) {
    params['filter[id_state]'] = resolvedStateId
  }

  const xml = await getXml('tax_rules', params)
  const doc = parseXml(xml)
  const ids = extractIdsByTag(doc, 'tax_rule')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  return ids[0] ?? null
}

export async function updateTaxRule(id, data) {
  const payload = buildTaxRulePayload({ ...data, id })
  const xml = buildEntityXml('tax_rule', payload)
  await putXml(`tax_rules/${id}`, xml)
}

export async function deleteTaxRule(id) {
  await deleteXml(`tax_rules/${id}`, undefined, true)
}

function buildTaxRulePayload(data) {
  const taxRulesGroupId = toInt(data.taxRulesGroupId, 0)
  const countryId = toInt(data.countryId, 0)
  const stateId = toInt(data.stateId, 0)
  const taxId = toInt(data.taxId, 0)
  const zipcodeFrom = data.zipcodeFrom ?? 0
  const zipcodeTo = data.zipcodeTo ?? 0
  const behavior = data.behavior ?? 0
  const description = data.description ?? ''

  return {
    id: data.id,
    id_tax_rules_group: taxRulesGroupId,
    id_country: countryId,
    id_state: stateId,
    zipcode_from: zipcodeFrom,
    zipcode_to: zipcodeTo,
    id_tax: taxId,
    behavior,
    description
  }
}
