// ============================================================================
// pdu.js  (API v1) — element de parc "PDU" (bandeau d'alimentation)
// ----------------------------------------------------------------------------
// Pas de "personne" associee. Le modele s'appelle "pdumodels_id".
//
// Champs GLPI reels : name, states_id, locations_id, manufacturers_id,
// pdumodels_id, otherserial.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class PDU {
  static itemtype = 'PDU'
  static endpoint = '/PDU'
  static label = 'PDU'
  static labelPluriel = 'PDU'

  constructor(row) {
    this.name = row.Name
    this.status = row.Status
    this.location = row.Location
    this.manufacturer = row.Manufacturer
    this.model = row.Model
    this.inventory = row.Inventory_Number
  }

  async toInput() {
    return {
      name: this.name,
      states_id: await resolveDropdown('State', this.status),
      locations_id: await resolveDropdown('Location', this.location),
      manufacturers_id: await resolveDropdown('Manufacturer', this.manufacturer),
      pdumodels_id: await resolveDropdown('PDUModel', this.model),
      otherserial: this.inventory
    }
  }

  async create() {
    const cree = await post(PDU.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(PDU.endpoint + query)
  }

  static getOne(id) {
    return get(PDU.endpoint + '/' + id)
  }

  static remove(id) {
    return del(PDU.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: PDU.itemtype,
      name: nettoyer(brut.name),
      status: nettoyer(brut.states_id),
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: nettoyer(brut.pdumodels_id),
      inventory: nettoyer(brut.otherserial),
      contact: ''
    }
  }
}
