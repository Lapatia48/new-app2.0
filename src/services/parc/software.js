// ============================================================================
// software.js  (API v1) — element de parc "Software" (Logiciel)
// ----------------------------------------------------------------------------
// Un logiciel n'a NI statut, NI modele, NI numero d'inventaire, NI personne :
// uniquement un nom, un lieu et un editeur (manufacturer). C'est exactement le
// genre de difference qui rendait la version "generique" inadaptee.
//
// Champs GLPI reels : name, locations_id, manufacturers_id.
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import { nettoyer } from './champs.js'

export default class Software {
  static itemtype = 'Software'
  static endpoint = '/Software'
  static label = 'Logiciel'
  static labelPluriel = 'Logiciels'

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
    const cree = await post(Software.endpoint, await this.toInput())
    return cree.id
  }

  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(Software.endpoint + query)
  }

  static getOne(id) {
    return get(Software.endpoint + '/' + id)
  }

  static remove(id) {
    return del(Software.endpoint + '/' + id + '?force_purge=true')
  }

  static toDisplay(brut) {
    return {
      id: brut.id,
      type: Software.itemtype,
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
