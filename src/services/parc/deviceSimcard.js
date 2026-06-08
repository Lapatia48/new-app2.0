// ============================================================================
// deviceSimcard.js  (API v1) — element de parc "DeviceSimcard" (Carte SIM)
// ----------------------------------------------------------------------------
// Autre cas qui cassait la version generique : la carte SIM n'a PAS de champ
// "name" ! Son libelle s'appelle "designation". Un POST avec "name" creait
// donc une SIM nommee "N/A". Elle n'a pas non plus de statut, de lieu ni de
// numero d'inventaire ; en revanche son "modele" est un TYPE de carte SIM
// (dropdown DeviceSimcardType).
//
// Champs GLPI reels : designation, manufacturers_id, devicesimcardtypes_id,
// voltage, allow_voip.  (Mapping CSV : Name -> designation,
// Model -> type de SIM.)
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class DeviceSimcard {
  static itemtype = 'DeviceSimcard'
  static endpoint = '/DeviceSimcard'
  static label = 'Carte SIM'
  static labelPluriel = 'Cartes SIM'

  constructor(row) {
    this.name = row.Name // ira dans "designation", pas dans "name"
    this.manufacturer = row.Manufacturer
    this.model = row.Model // pour une SIM, "Model" decrit le TYPE de carte
  }

  async toInput() {
    return {
      designation: this.name,
      manufacturers_id: await resolveDropdown('Manufacturer', this.manufacturer),
      devicesimcardtypes_id: await resolveDropdown('DeviceSimcardType', this.model)
    }
  }

  async create() {
    const cree = await post(DeviceSimcard.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(DeviceSimcard.endpoint + query)
  }

  static getOne(id) {
    return get(DeviceSimcard.endpoint + '/' + id)
  }

  static remove(id) {
    return del(DeviceSimcard.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: DeviceSimcard.itemtype,
      name: nettoyer(brut.designation), // <-- designation, pas name
      status: '',
      location: '',
      manufacturer: nettoyer(brut.manufacturers_id),
      model: nettoyer(brut.devicesimcardtypes_id), // type de SIM
      inventory: '',
      contact: ''
    }
  }
}
