// ============================================================================
// computer.js  (API v1)
// ----------------------------------------------------------------------------
// Service pour l'entite "Computer" (ordinateur) de GLPI.
// La transformation d'une ligne de CSV en objet GLPI se fait dans importData.js.
// ============================================================================

import { get, post, put, del } from './api.js'

const ENDPOINT = '/Computer'

// Liste tous les ordinateurs.
// options.expand = true  -> affiche le NOM des dropdowns au lieu de l'id.
export function getAll(options = {}) {
  let query = '?range=0-9999&get_hateoas=false'
  if (options.expand) query += '&expand_dropdowns=true'
  return get(ENDPOINT + query)
}

// Recupere un ordinateur par son id.
export function getOne(id) {
  return get(ENDPOINT + '/' + id)
}

// Cree un ordinateur. "input" contient les champs GLPI (name, serial, ...).
export function create(input) {
  return post(ENDPOINT, input)
}

// Modifie un ordinateur existant.
export function update(id, input) {
  return put(ENDPOINT + '/' + id, input)
}

// Supprime DEFINITIVEMENT un ordinateur (force_purge = pas de corbeille).
export function remove(id) {
  return del(ENDPOINT + '/' + id + '?force_purge=true')
}
