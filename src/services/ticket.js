// ============================================================================
// ticket.js
// ----------------------------------------------------------------------------
// Service pour l'entite "Ticket" (assistance) de GLPI.
// ============================================================================

import { get, post, patch, del } from './api.js'

const ENDPOINT = '/Assistance/Ticket'

export function getAll() {
  return get(ENDPOINT)
}

export function getOne(id) {
  return get(ENDPOINT + '/' + id)
}

export function create(body) {
  return post(ENDPOINT, body)
}

export function update(id, body) {
  return patch(ENDPOINT + '/' + id, body)
}

export function remove(id) {
  return del(ENDPOINT + '/' + id + '?force=true')
}
