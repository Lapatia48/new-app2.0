// ============================================================================
// elements.js  (API v1)
// ----------------------------------------------------------------------------
// Dans le frontoffice, un "element" est un materiel du parc (Computer, Monitor,
// Cable, carte SIM...). Ce service interroge CHAQUE classe d'element (cf
// parc/index.js) et fusionne le tout dans UNE seule liste d'objets simples et
// uniformes (toujours les memes cles : name, status, location...).
//
// La transformation "objet GLPI brut -> objet d'affichage" est faite par la
// methode toDisplay() de chaque classe : c'est elle qui sait, par exemple, que
// le nom d'une carte SIM est dans "designation" et pas dans "name".
//
// On demande "expand_dropdowns" pour recevoir le NOM des dropdowns (statut,
// lieu...) au lieu de leur id.
// ============================================================================

import { ELEMENTS } from './parc/index.js'
import { getImageUrl } from './images.js'
import { getItemImageUrl } from './document.js'

// Renvoie tous les elements du parc (tous types confondus) dans une seule liste.
// Pour chaque element, on va aussi chercher l'image reellement rattachee dans
// GLPI (GET documents) et on l'utilise comme miniature.
export async function getAllElements() {
  let elements = []

  for (const Element of ELEMENTS) {
    try {
      const bruts = await Element.getAll({ expand: true })
      // toDisplay() uniformise l'objet ; on ajoute l'image de repli locale
      // (miniature nommee comme le materiel) qui pourra etre remplacee ensuite.
      elements = elements.concat(
        bruts.map((brut) => {
          const el = Element.toDisplay(brut)
          el.image = getImageUrl(el.name)
          return el
        })
      )
    } catch (e) {
      // Un type non listable (droits manquants, itemtype absent dans ce GLPI...)
      // est simplement ignore : il ne doit pas casser toute la liste.
    }
  }

  // Recuperation des images GLPI en parallele. Un echec (pas de document,
  // droits manquants...) laisse simplement l'image de repli en place.
  await Promise.all(
    elements.map(async (el) => {
      try {
        const url = await getItemImageUrl(el.type, el.id)
        if (url) el.image = url
      } catch (e) {
        // on garde l'image de repli (locale ou aucune)
      }
    })
  )

  return elements
}
