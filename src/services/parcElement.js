// ============================================================================
// parcElement.js  (API v1)
// ----------------------------------------------------------------------------
// Service generique pour les "elements du parc" (Computer, Monitor, ...).
// Tous ces types se ressemblent dans GLPI (memes operations CRUD), seul
// l'endpoint et le dropdown de "modele" changent. La liste des types geres
// vient de parcElements.json : pour ajouter un nouveau type de materiel
// (Printer, Peripheral, ...) il suffit d'ajouter une entree dans ce fichier,
// sans toucher au code.
// ============================================================================

import { get, post, put, del } from './api.js'
import definitions from './parcElements.json'

// Liste des types d'elements du parc geres par l'application.
export const TYPES = definitions

// Renvoie la definition d'un type ('Computer', 'Monitor', ...), ou leve une
// exception si le type n'est pas reconnu.
export function getDefinition(itemtype) {
  const def = TYPES.find((t) => t.itemtype === itemtype)
  if (!def) {
    throw new Error('Type d\'element du parc inconnu : "' + itemtype + '".')
  }
  return def
}

// Liste tous les elements d'un type.
// options.expand = true  -> affiche le NOM des dropdowns au lieu de l'id.
export function getAll(itemtype, options = {}) {
  let query = '?range=0-9999&get_hateoas=false'
  if (options.expand) query += '&expand_dropdowns=true'
  return get(getDefinition(itemtype).endpoint + query)
}

export function getOne(itemtype, id) {
  return get(getDefinition(itemtype).endpoint + '/' + id)
}

// Cree un ordinateur. "input" contient les champs GLPI (name, serial, ...)
export function create(itemtype, input) {
  return post(getDefinition(itemtype).endpoint, input)
}

export function update(itemtype, id, input) {
  return put(getDefinition(itemtype).endpoint + '/' + id, input)
}

// Supprime DEFINITIVEMENT un element (force_purge = pas de corbeille).
export function remove(itemtype, id) {
  return del(getDefinition(itemtype).endpoint + '/' + id + '?force_purge=true')
}
