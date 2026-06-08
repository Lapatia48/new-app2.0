// ============================================================================
// peripheral.js  (API v1) — element de parc "Peripheral" (Peripherique)
// ----------------------------------------------------------------------------
// Champs GLPI reels : name, states_id, locations_id, manufacturers_id,
// peripheralmodels_id, otherserial, contact.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import User from '../user.js'
import { nettoyer } from './champs.js'

export default class Peripheral {
  static itemtype = 'Peripheral'
  static endpoint = '/Peripheral'
  static label = 'Peripherique'
  static labelPluriel = 'Peripheriques'

  constructor(row) {
    this.name = row.Name
    this.status = row.Status
    this.location = row.Location
    this.manufacturer = row.Manufacturer
    this.model = row.Model
    this.inventory = row.Inventory_Number
    this.user = row.User
  }

  async toInput() {
    return {
      name: this.name,
      states_id: await resolveDropdown('State', this.status),
      locations_id: await resolveDropdown('Location', this.location),
      manufacturers_id: await resolveDropdown('Manufacturer', this.manufacturer),
      peripheralmodels_id: await resolveDropdown('PeripheralModel', this.model),
      otherserial: this.inventory,
      users_id: await User.resolveByName(this.user)
    }
  }

  async create() {
    const cree = await post(Peripheral.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(Peripheral.endpoint + query)
  }

  static getOne(id) {
    return get(Peripheral.endpoint + '/' + id)
  }

  static remove(id) {
    return del(Peripheral.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: Peripheral.itemtype,
      name: nettoyer(brut.name),
      status: nettoyer(brut.states_id),
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: nettoyer(brut.peripheralmodels_id),
      inventory: nettoyer(brut.otherserial),
      contact: nettoyer(brut.users_id) // nom du proprietaire (expand_dropdowns)
    }
  }
}
