import { DEFAULT_LANG_ID } from '@/services/constants'
import { deleteXml, getXml, postXml, putXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, extractIdsByTag, getIdFromXml, langField, parseXml } from '@/services/xml/xmlUtils'

export function listTaxIds() {
  return fetchAllIds('taxes', 'tax')
}

export async function createTax(data, langId = DEFAULT_LANG_ID) {
  const payload = buildTaxPayload(data, langId)
  const xml = buildEntityXml('tax', payload)
  const responseXml = await postXml('taxes', xml)
  const id = getIdFromXml(responseXml, 'tax')
  if (!id) {
    throw new Error('Missing tax id in response')
  }
  return id
}

export async function findTaxIdByRate(rate) {
  const normalizedRate = normalizeTaxRate(rate)
  if (!normalizedRate) {
    return null
  }
  const xml = await getXml('taxes', {
    display: '[id]',
    'filter[rate]': normalizedRate
  })
  const doc = parseXml(xml)
  const ids = extractIdsByTag(doc, 'tax')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  return ids[0] ?? null
}

export async function findTaxIdByName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) {
    return null
  }
  const xml = await getXml('taxes', {
    display: '[id]',
    'filter[name]': trimmed
  })
  const doc = parseXml(xml)
  const ids = extractIdsByTag(doc, 'tax')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  return ids[0] ?? null
}

export async function updateTax(id, data, langId = DEFAULT_LANG_ID) {
  const payload = buildTaxPayload({ ...data, id }, langId)
  const xml = buildEntityXml('tax', payload)
  await putXml(`taxes/${id}`, xml)
}

export async function deleteTax(id) {
  await deleteXml(`taxes/${id}`, undefined, true)
}

function buildTaxPayload(data, langId) {
  const name = String(data.name || '').trim()
  const rate = normalizeTaxRate(data.rate) || '0.00'
  const active = data.active === false ? 0 : 1

  return {
    id: data.id,
    active,
    rate,
    name: langField(name, langId)
  }
}

function normalizeTaxRate(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return numeric.toFixed(2)
}
