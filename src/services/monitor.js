// ============================================================================
// monitor.js  (API v1)
// ----------------------------------------------------------------------------
// Service pour l'entite "Monitor" (ecran) de GLPI.
// Meme structure que computer.js.
// ============================================================================

import { get, post, put, del } from './api.js'

const ENDPOINT = '/Monitor'

export function getAll(options = {}) {
  let query = '?range=0-9999&get_hateoas=false'
  if (options.expand) query += '&expand_dropdowns=true'
  return get(ENDPOINT + query)
}

export function getOne(id) {
  return get(ENDPOINT + '/' + id)
}

export function create(input) {
  return post(ENDPOINT, input)
}

export function update(id, input) {
  return put(ENDPOINT + '/' + id, input)
}

export function remove(id) {
  return del(ENDPOINT + '/' + id + '?force_purge=true')
}
