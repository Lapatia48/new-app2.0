// ============================================================================
// cable.js  (API v1) — element de parc "Cable" (Cable)
// ----------------------------------------------------------------------------
// ATTENTION : c'est CET element qui provoquait l'erreur 400 avec l'ancienne
// version generique. Deux raisons :
//   1. l'ancien code visait l'itemtype "NetworkPort" (un port reseau), qui
//      EXIGE des champs items_id / itemtype : un POST avec juste un "name" est
//      donc refuse (HTTP 400). Le bon itemtype pour un cable est "Cable".
//   2. un cable n'a PAS de fabricant ni de lieu, et son "modele" est en
//      realite un TYPE de cable -> champ "cabletypes_id" (dropdown CableType),
//      pas "...models_id".
//
// Champs GLPI reels : name, states_id, cabletypes_id, otherserial.
// (Mapping CSV : Model -> type de cable, Inventory_Number -> otherserial.)
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class Cable {
  static itemtype = 'Cable'
  static endpoint = '/Cable'
  static label = 'Cable'
  static labelPluriel = 'Cables'

  constructor(row) {
    this.name = row.Name
    this.status = row.Status
    this.model = row.Model // pour un cable, "Model" decrit le TYPE de cable
    this.inventory = row.Inventory_Number
  }

  async toInput() {
    return {
      name: this.name,
      states_id: await resolveDropdown('State', this.status),
      cabletypes_id: await resolveDropdown('CableType', this.model),
      otherserial: this.inventory
    }
  }

  async create() {
    const cree = await post(Cable.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(Cable.endpoint + query)
  }

  static getOne(id) {
    return get(Cable.endpoint + '/' + id)
  }

  static remove(id) {
    return del(Cable.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: Cable.itemtype,
      name: nettoyer(brut.name),
      status: nettoyer(brut.states_id),
      location: '',
      manufacturer: '',
      model: nettoyer(brut.cabletypes_id), // le type de cable sert de "modele"
      inventory: nettoyer(brut.otherserial),
      contact: ''
    }
  }
}
