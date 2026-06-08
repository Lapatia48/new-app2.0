// ============================================================================
// user.js  (API v1) — entite "User" (Utilisateur) de GLPI
// ----------------------------------------------------------------------------
// Dans le 1er CSV (materiels), la colonne "User" contient le nom de la personne
// qui possede le materiel. GLPI stocke ca dans une VRAIE table d'utilisateurs :
// le materiel pointe vers l'utilisateur par son id (champ "users_id").
//
// Il faut donc, pour chaque nom rencontre :
//   1. regarder si un utilisateur de ce nom existe deja  -> reutiliser son id
//   2. sinon le creer                                    -> renvoyer le nouvel id
// (exactement le meme principe que resolveDropdown pour Location, Manufacturer...)
// Ce "find-or-create" evite l'erreur de doublon : le login GLPI est unique, donc
// creer deux fois "Rakoto Jean" leverait une erreur.
//
// IMPORTANT pour le reset : on ne doit JAMAIS supprimer les comptes systeme de
// GLPI (glpi, tech, normal...). A la creation, on marque donc nos utilisateurs
// avec un "comment" sentinelle (IMPORT_TAG) ; le reset ne supprime que ceux-la.
// ============================================================================

import { get, post, del } from './api.js'

const ENDPOINT = '/User'

// Marque posee dans le champ "comment" des utilisateurs crees par l'import.
// Le reset s'en sert pour ne supprimer QUE ces utilisateurs (et epargner les
// comptes systeme glpi / tech / normal / ...).
const IMPORT_TAG = 'import-fako'

// Petit cache cache["Rakoto Jean"] = 7, pour ne pas rechercher/creer deux fois
// le meme utilisateur pendant un import.
const cache = {}

export default class User {
  static itemtype = 'User'
  static endpoint = ENDPOINT

  // --- Lecture : liste de tous les utilisateurs ---
  static getAll(options = {}) {
    let query = '?range=0-9999&get_hateoas=false'
    if (options.expand) query += '&expand_dropdowns=true'
    return get(ENDPOINT + query)
  }

  static getOne(id) {
    return get(ENDPOINT + '/' + id)
  }

  // --- Suppression DEFINITIVE (force_purge) ---
  static remove(id) {
    return del(ENDPOINT + '/' + id + '?force_purge=true')
  }

  // --- find-or-create : renvoie l'id de l'utilisateur portant ce nom ---
  // Renvoie 0 (= "aucun" dans GLPI) si le nom est vide.
  static async resolveByName(name) {
    if (!name) {
      return 0
    }

    // Deja vu pendant cet import ? on renvoie l'id memorise.
    if (cache[name] !== undefined) {
      return cache[name]
    }

    // 1. Recherche par le nom (searchText = recherche "contient").
    const resultats = await get(ENDPOINT + '?searchText[name]=' + encodeURIComponent(name) + '&range=0-99')

    // On ne garde que la correspondance EXACTE sur le login (champ "name").
    const exact = Array.isArray(resultats)
      ? resultats.find((u) => u.name === name)
      : null

    if (exact) {
      cache[name] = exact.id
      return exact.id
    }

    // 2. Pas trouve -> on le cree (avec la marque IMPORT_TAG).
    const cree = await post(ENDPOINT, { name, comment: IMPORT_TAG })
    cache[name] = cree.id
    return cree.id
  }

  // --- Reset : supprime UNIQUEMENT les utilisateurs crees par l'import ---
  // On reconnait ces utilisateurs a leur "comment" = IMPORT_TAG. Les comptes
  // systeme de GLPI (glpi, tech, normal...) ont un autre comment et sont donc
  // epargnes. Renvoie le nombre d'utilisateurs supprimes.
  static async removeImported(log = () => {}) {
    const utilisateurs = await User.getAll()
    let nombre = 0
    for (const u of utilisateurs) {
      if (u.comment === IMPORT_TAG) {
        await User.remove(u.id)
        log('  - Utilisateur supprime : ' + (u.name || u.id))
        nombre++
      }
    }
    return nombre
  }

  // Apres un reset, les ids ont disparu : on vide le cache.
  static clearCache() {
    for (const cle of Object.keys(cache)) {
      delete cache[cle]
    }
  }
}
