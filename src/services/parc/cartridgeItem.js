// ============================================================================
// cartridgeItem.js  (API v1) — element de parc "CartridgeItem" (Cartouche)
// ----------------------------------------------------------------------------
// Une cartouche : juste un nom, un lieu et un fabricant.
//
// Champs GLPI reels : name, locations_id, manufacturers_id.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class CartridgeItem {
  static itemtype = 'CartridgeItem'
  static endpoint = '/CartridgeItem'
  static label = 'Cartouche'
  static labelPluriel = 'Cartouches'

  constructor(row) {
    this.name = row.Name
    this.location = row.Location
    this.manufacturer = row.Manufacturer
  }

  async toInput() {
    return {
      name: this.name,
      locations_id: await resolveDropdown('Location', this.location),
      manufacturers_id: await resolveDropdown('Manufacturer', this.manufacturer)
    }
  }

  async create() {
    const cree = await post(CartridgeItem.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(CartridgeItem.endpoint + query)
  }

  static getOne(id) {
    return get(CartridgeItem.endpoint + '/' + id)
  }

  static remove(id) {
    return del(CartridgeItem.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: CartridgeItem.itemtype,
      name: nettoyer(brut.name),
      status: '',
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: '',
      inventory: '',
      contact: ''
    }
  }
}
