import { glpiClient } from './client'

function buildQuery(params) {
  const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined)
  if (!entries.length) {
    return ''
  }

  const search = new URLSearchParams()
  for (const [key, value] of entries) {
    search.append(key, String(value))
  }

  return `?${search.toString()}`
}

export function listEntities(endpoint, params) {
  return glpiClient.get(`${endpoint}${buildQuery(params)}`)
}

export function createEntity(endpoint, payload) {
  return glpiClient.post(endpoint, payload)
}

export function updateEntity(endpoint, id, payload) {
  return glpiClient.put(`${endpoint}/${id}`, payload)
}

export function deleteEntity(endpoint, id) {
  return glpiClient.delete(`${endpoint}/${id}`)
}
