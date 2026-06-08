// ============================================================================
// computer.js  (API v1) — element de parc "Computer" (Ordinateur)
// ----------------------------------------------------------------------------
// Philosophie : 1 element = 1 classe (comme une classe Java).
//   - le CONSTRUCTEUR prend une ligne de CSV et range chaque colonne dans un
//     attribut de l'objet ;
//   - toInput()  fabrique le payload EXACT attendu par GLPI pour CE type
//     (chaque type a ses propres champs : un Computer a un modele, une carte
//      SIM non) et resout les dropdowns (texte -> id) ;
//   - create()   envoie ce payload (POST) et renvoie l'id cree ;
//   - getAll / getOne / remove (statiques) lisent / suppriment ;
//   - toDisplay() transforme un objet GLPI brut en objet d'affichage uniforme
//     pour le frontoffice.
//
// Champs GLPI reels (verifies via l'API) :
//   name, states_id, locations_id, manufacturers_id, computermodels_id,
//   otherserial (= numero d'inventaire), users_id (= proprietaire).
// La colonne "User" du CSV est reliee a un VRAI utilisateur GLPI (users_id),
// cree au besoin par User.resolveByName (cf user.js).
// ============================================================================

import { get, post, del } from '../api.js'
import { resolveDropdown } from '../dropdowns.js'
import User from '../user.js'
import { nettoyer } from './champs.js'

export default class Computer {
  // Constantes de la classe (equivalent des "static final" en Java).
  static itemtype = 'Computer'
  static endpoint = '/Computer'
  static label = 'Ordinateur'
  static labelPluriel = 'Ordinateurs'

  // --- Constructeur : 1 ligne de CSV -> 1 objet Computer ---
  constructor(row) {
    this.name = row.Name
    this.status = row.Status
    this.location = row.Location
    this.manufacturer = row.Manufacturer
    this.model = row.Model
    this.inventory = row.Inventory_Number
    this.user = row.User
  }

  // --- toInput : payload GLPI (texte -> id pour les dropdowns) ---
  async toInput() {
    return {
      name: this.name,
      states_id: await resolveDropdown('State', this.status),
      locations_id: await resolveDropdown('Location', this.location),
      manufacturers_id: await resolveDropdown('Manufacturer', this.manufacturer),
      computermodels_id: await resolveDropdown('ComputerModel', this.model),
      otherserial: this.inventory,
      users_id: await User.resolveByName(this.user)
    }
  }

  // --- create : POST de l'ordinateur, renvoie l'id GLPI cree ---
  async create() {
    const cree = await post(Computer.endpoint, await this.toInput())
    return cree.id
  }

  // --- Lecture : liste de tous les ordinateurs ---
  // options.expand = true -> renvoie le NOM des dropdowns au lieu de l'id.
  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(Computer.endpoint + query)
  }

  static getOne(id) {
    return get(Computer.endpoint + '/' + id)
  }

  // --- Suppression DEFINITIVE (force_purge = pas de corbeille) ---
  static remove(id) {
    return del(Computer.endpoint + '/' + id + '?force_purge=true')
  }

  // --- toDisplay : objet GLPI brut (expand_dropdowns) -> objet d'affichage ---
  static toDisplay(brut) {
    return {
      id: brut.id,
      type: Computer.itemtype,
      name: nettoyer(brut.name),
      status: nettoyer(brut.states_id),
      location: nettoyer(brut.locations_id),
      manufacturer: nettoyer(brut.manufacturers_id),
      model: nettoyer(brut.computermodels_id),
      inventory: nettoyer(brut.otherserial),
      contact: nettoyer(brut.users_id) // nom du proprietaire (expand_dropdowns)
    }
  }
}
