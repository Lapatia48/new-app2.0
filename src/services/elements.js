// ============================================================================
// elements.js
// ----------------------------------------------------------------------------
// Dans le frontoffice, on parle d'"elements" (= materiels). Un element peut
// etre un ordinateur (Computer) ou un ecran (Monitor).
//
// Ce service va chercher les deux types dans GLPI et les met dans UNE seule
// liste, avec des champs simples et toujours au meme format. Les pages du
// frontoffice n'ont donc pas a savoir d'ou vient chaque element.
// ============================================================================

import * as computer from './computer.js'
import * as monitor from './monitor.js'
import { getImageUrl } from './images.js'

// Les champs status/location/... arrivent de GLPI sous forme d'objet { id, name }.
// Cette petite fonction renvoie le nom, ou '' si le champ est vide.
function nom(objet) {
  return objet && objet.name ? objet.name : ''
}

// Transforme un materiel GLPI en objet simple et uniforme.
function versElement(brut, type) {
  return {
    id: brut.id,
    type, // 'Computer' ou 'Monitor'
    name: brut.name || '',
    status: nom(brut.status),
    location: nom(brut.location),
    manufacturer: nom(brut.manufacturer),
    model: nom(brut.model),
    inventory: brut.otherserial || '',
    contact: brut.contact || '',
    image: getImageUrl(brut.name) // image locale si elle existe
  }
}

// Renvoie tous les elements (ordinateurs + ecrans) dans une seule liste.
export async function getAllElements() {
  const computers = await computer.getAll()
  const monitors = await monitor.getAll()

  return [
    ...computers.map((c) => versElement(c, 'Computer')),
    ...monitors.map((m) => versElement(m, 'Monitor'))
  ]
}
