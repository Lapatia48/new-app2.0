// ============================================================================
// elements.js  (API v1)
// ----------------------------------------------------------------------------
// Dans le frontoffice, un "element" est un materiel du parc (Computer, Monitor,
// ...). Ce service va chercher tous les types definis dans parcElements.json
// et les met dans UNE seule liste, avec des champs simples et toujours au
// meme format.
//
// On demande "expand_dropdowns" pour recevoir le NOM des dropdowns (statut,
// lieu, ...) au lieu de leur id.
// ============================================================================

import * as parcElement from './parcElement.js'
import { getImageUrl } from './images.js'

// Avec expand_dropdowns, un champ vide revient sous la forme "&nbsp;".
// Cette fonction renvoie une valeur propre (ou '' si vide).
function propre(valeur) {
  if (valeur === null || valeur === undefined) return ''
  if (valeur === '&nbsp;' || valeur === '0' || valeur === 0) return ''
  return String(valeur)
}

// Transforme un materiel GLPI brut en objet simple et uniforme.
// "def" est la definition du type (parcElements.json). On construit l'objet a
// partir de def.fields (le meme mapping que pour l'import, mais dans l'autre
// sens) : chaque champ a un "role" qui donne la cle d'affichage. Les roles
// absents pour ce type (un Software n'a pas de "model") restent a ''.
function versElement(brut, def) {
  const element = {
    id: brut.id,
    type: def.itemtype, // 'Computer', 'Monitor', ...
    name: '',
    status: '',
    location: '',
    manufacturer: '',
    model: '',
    inventory: '',
    contact: '',
    image: getImageUrl(brut.name) // miniature locale si elle existe
  }

  for (const champ of def.fields) {
    element[champ.role] = propre(brut[champ.glpi])
  }

  return element
}

// Renvoie tous les elements du parc (tous types confondus) dans une seule liste.
export async function getAllElements() {
  let elements = []

  for (const def of parcElement.TYPES) {
    try {
      const bruts = await parcElement.getAll(def.itemtype, { expand: true })
      elements = elements.concat(bruts.map((brut) => versElement(brut, def)))
    } catch (e) {
      // Un type non listable (droits manquants, itemtype absent dans ce GLPI...)
      // est simplement ignore : il ne doit pas casser toute la liste.
    }
  }

  return elements
}
