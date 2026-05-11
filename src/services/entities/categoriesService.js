import { DEFAULT_CATEGORY_ID, DEFAULT_LANG_ID } from '@/services/constants'
import { deleteXml, getXml, postXml, putXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, getIdFromXml, langField, xmlToJson } from '@/services/xml/xmlUtils'
import { slugify } from '@/services/utils/stringUtils'

export function listCategoryIds() {
  return fetchAllIds('categories', 'category')
}

export async function readCategory(id) {
  const xml = await getXml(`categories/${id}`)
  return xmlToJson(xml)
}

export async function createCategory(data, langId = DEFAULT_LANG_ID) {
  const payload = buildCategoryPayload(data, langId)
  const xml = buildEntityXml('category', payload)
  const responseXml = await postXml('categories', xml)
  const id = getIdFromXml(responseXml, 'category')
  if (!id) {
    throw new Error('Missing category id in response')
  }
  return id
}

export async function updateCategory(id, data, langId = DEFAULT_LANG_ID) {
  const payload = buildCategoryPayload({ ...data, id }, langId)
  const xml = buildEntityXml('category', payload)
  await putXml(`categories/${id}`, xml)
}

export async function deleteCategory(id) {
  await deleteXml(`categories/${id}`, undefined, true)
}

function buildCategoryPayload(data, langId) {
  const name = data.name?.trim() || ''
  const linkRewrite = data.linkRewrite?.trim() || slugify(name)
  const description = data.description ?? ''
  const active = data.active === false ? 0 : 1
  const parentId = data.parentId ?? DEFAULT_CATEGORY_ID

  return {
    id: data.id,
    id_parent: parentId,
    active,
    name: langField(name, langId),
    link_rewrite: langField(linkRewrite, langId),
    description: langField(description, langId)
  }
}
