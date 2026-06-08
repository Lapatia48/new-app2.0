// ============================================================================
// consumableItem.js  (API v1) — element de parc "ConsumableItem" (Consommable)
// ----------------------------------------------------------------------------
// Comme la cartouche, mais le consommable accepte EN PLUS un numero
// d'inventaire (otherserial).
//
// Champs GLPI reels : name, locations_id, manufacturers_id, otherserial.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class ConsumableItem {
  static itemtype = 'ConsumableItem'
  static endpoint = '/ConsumableItem'
  static label = 'Consommable'
  static labelPluriel = 'Consommables'

  constructor(row) {
    this.name = row.Name
    this.location = row.Location
    this.manufacturer = row.Manufacturer
    this.inventory = row.Inventory_Number
  }

  async toInput() {
    return {
      name: this.name,
      locations_id: await resolveDropdown('Location', this.location),
      manufacturers_id: await resolveDropdown('Manufacturer', this.manufacturer),
      otherserial: this.inventory
    }
  }

  async create() {
    const cree = await post(ConsumableItem.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(ConsumableItem.endpoint + query)
  }

  static getOne(id) {
    return get(ConsumableItem.endpoint + '/' + id)
  }

  static remove(id) {
    return del(ConsumableItem.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: ConsumableItem.itemtype,
      name: nettoyer(brut.name),
      status: '',
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: '',
      inventory: nettoyer(brut.otherserial),
      contact: ''
    }
  }
}
