// ============================================================================
// computer.js
// ----------------------------------------------------------------------------
// Service pour l'entite "Computer" (ordinateur) de GLPI.
// Il expose les 4 actions de base de l'API : get, post, patch, delete.
// La transformation d'une ligne de CSV en objet GLPI se fait dans importData.js.
// ============================================================================

import { get, post, patch, del } from './api.js'

const ENDPOINT = '/Assets/Computer'

// Liste tous les ordinateurs.
export function getAll() {
  return get(ENDPOINT)
}

// Recupere un ordinateur par son id.
export function getOne(id) {
  return get(ENDPOINT + '/' + id)
}

// Cree un ordinateur. "body" est l'objet attendu par GLPI.
export function create(body) {
  return post(ENDPOINT, body)
}

// Modifie un ordinateur existant.
export function update(id, body) {
  return patch(ENDPOINT + '/' + id, body)
}

// Supprime DEFINITIVEMENT un ordinateur (force=true = pas de corbeille).
export function remove(id) {
  return del(ENDPOINT + '/' + id + '?force=true')
}
