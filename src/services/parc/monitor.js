// ============================================================================
// monitor.js  (API v1) — element de parc "Monitor" (Ecran)
// ----------------------------------------------------------------------------
// Meme structure que computer.js. Seule difference reelle cote GLPI : le champ
// du modele s'appelle "monitormodels_id" (dropdown "MonitorModel").
//
// Champs GLPI reels : name, states_id, locations_id, manufacturers_id,
// monitormodels_id, otherserial, contact.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import User from '../user.js'
import { nettoyer } from './champs.js'

export default class Monitor {
  static itemtype = 'Monitor'
  static endpoint = '/Monitor'
  static label = 'Ecran'
  static labelPluriel = 'Ecrans'

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
      monitormodels_id: await resolveDropdown('MonitorModel', this.model),
      otherserial: this.inventory,
      users_id: await User.resolveByName(this.user)
    }
  }

  async create() {
    const cree = await post(Monitor.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(Monitor.endpoint + query)
  }

  static getOne(id) {
    return get(Monitor.endpoint + '/' + id)
  }

  static remove(id) {
    return del(Monitor.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: Monitor.itemtype,
      name: nettoyer(brut.name),
      status: nettoyer(brut.states_id),
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: nettoyer(brut.monitormodels_id),
      inventory: nettoyer(brut.otherserial),
      contact: nettoyer(brut.users_id) // nom du proprietaire (expand_dropdowns)
    }
  }
}
