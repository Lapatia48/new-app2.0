// ============================================================================
// rack.js  (API v1) — element de parc "Rack" (Baie)
// ----------------------------------------------------------------------------
// Une baie n'a PAS de "personne" associee (pas de champ contact). Sinon meme
// principe que les autres.
//
// Champs GLPI reels : name, states_id, locations_id, manufacturers_id,
// rackmodels_id, otherserial.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class Rack {
  static itemtype = 'Rack'
  static endpoint = '/Rack'
  static label = 'Baie'
  static labelPluriel = 'Baies'

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
      rackmodels_id: await resolveDropdown('RackModel', this.model),
      otherserial: this.inventory
    }
  }

  async create() {
    const cree = await post(Rack.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(Rack.endpoint + query)
  }

  static getOne(id) {
    return get(Rack.endpoint + '/' + id)
  }

  static remove(id) {
    return del(Rack.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: Rack.itemtype,
      name: nettoyer(brut.name),
      status: nettoyer(brut.states_id),
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: nettoyer(brut.rackmodels_id),
      inventory: nettoyer(brut.otherserial),
      contact: ''
    }
  }
}
