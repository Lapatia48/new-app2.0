import { getXml, postXml, putXml, deleteXml } from '@/services/http/prestashopClient'
import { fetchAllIds } from '@/services/entities/entityUtils'
import { buildEntityXml, getIdFromXml, xmlToJson } from '@/services/xml/xmlUtils'

export function createCrud(resource, tag) {
  return {
    listIds() {
      return fetchAllIds(resource, tag)
    },
    async read(id) {
      const xml = await getXml(`${resource}/${id}`)
      return xmlToJson(xml)
    },
    async create(data) {
      const xml = buildEntityXml(tag, data)
      const responseXml = await postXml(resource, xml)
      const newId = getIdFromXml(responseXml, tag)
      if (!newId) {
        throw new Error(`Missing ${tag} id in response`)
      }
      return newId
    },
    async update(id, data) {
      const xml = buildEntityXml(tag, { ...data, id })
      await putXml(`${resource}/${id}`, xml)
    },
    async remove(id) {
      await deleteXml(`${resource}/${id}`, undefined, true)
    }
  }
}
