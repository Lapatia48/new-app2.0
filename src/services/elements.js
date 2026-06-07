// ============================================================================
// elements.js  (API v1)
// ----------------------------------------------------------------------------
// Dans le frontoffice, un "element" est un materiel : ordinateur (Computer) ou
// ecran (Monitor). Ce service va chercher les deux types et les met dans UNE
// seule liste, avec des champs simples et toujours au meme format.
//
// On demande "expand_dropdowns" pour recevoir le NOM des dropdowns (statut,
// lieu, ...) au lieu de leur id.
// ============================================================================

import * as computer from './computer.js'
import * as monitor from './monitor.js'
import { getImageUrl } from './images.js'

// Avec expand_dropdowns, un champ vide revient sous la forme "&nbsp;".
// Cette fonction renvoie une valeur propre (ou '' si vide).
function propre(valeur) {
  if (valeur === null || valeur === undefined) return ''
  if (valeur === '&nbsp;' || valeur === '0' || valeur === 0) return ''
  return String(valeur)
}

// Transforme un materiel GLPI brut en objet simple et uniforme.
function versElement(brut, type) {
  // Le champ "modele" n'a pas le meme nom selon le type.
  const modele = type === 'Computer' ? brut.computermodels_id : brut.monitormodels_id

  return {
    id: brut.id,
    type, // 'Computer' ou 'Monitor'
    name: propre(brut.name),
    status: propre(brut.states_id),
    location: propre(brut.locations_id),
    manufacturer: propre(brut.manufacturers_id),
    model: propre(modele),
    inventory: propre(brut.otherserial),
    contact: propre(brut.contact),
    image: getImageUrl(brut.name) // miniature locale si elle existe
  }
}

// Renvoie tous les elements (ordinateurs + ecrans) dans une seule liste.
export async function getAllElements() {
  const computers = await computer.getAll({ expand: true })
  const monitors = await monitor.getAll({ expand: true })

  return [
    ...computers.map((c) => versElement(c, 'Computer')),
    ...monitors.map((m) => versElement(m, 'Monitor'))
  ]
}
