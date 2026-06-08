// ============================================================================
// passiveDCEquipment.js  (API v1) — element de parc "PassiveDCEquipment"
// (Equipement passif de datacenter : panneau de brassage, ...).
// ----------------------------------------------------------------------------
// Pas de "personne" associee. Le modele s'appelle "passivedcequipmentmodels_id".
//
// Champs GLPI reels : name, states_id, locations_id, manufacturers_id,
// passivedcequipmentmodels_id, otherserial.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class PassiveDCEquipment {
  static itemtype = 'PassiveDCEquipment'
  static endpoint = '/PassiveDCEquipment'
  static label = 'Equipement passif'
  static labelPluriel = 'Equipements passifs'

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
      passivedcequipmentmodels_id: await resolveDropdown('PassiveDCEquipmentModel', this.model),
      otherserial: this.inventory
    }
  }

  async create() {
    const cree = await post(PassiveDCEquipment.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(PassiveDCEquipment.endpoint + query)
  }

  static getOne(id) {
    return get(PassiveDCEquipment.endpoint + '/' + id)
  }

  static remove(id) {
    return del(PassiveDCEquipment.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: PassiveDCEquipment.itemtype,
      name: nettoyer(brut.name),
      status: nettoyer(brut.states_id),
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: nettoyer(brut.passivedcequipmentmodels_id),
      inventory: nettoyer(brut.otherserial),
      contact: ''
    }
  }
}
