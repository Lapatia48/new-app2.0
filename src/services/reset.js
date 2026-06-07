// ============================================================================
// reset.js
// ----------------------------------------------------------------------------
// Reinitialise les donnees : on supprime DEFINITIVEMENT tout ce qui a ete
// importe (tickets + tous les types d'elements du parc geres par
// parcElements.json). Les couts d'un ticket sont supprimes automatiquement
// en meme temps que le ticket.
//
// "log" est une fonction optionnelle pour afficher l'avancement a l'ecran.
// ============================================================================

import * as parcElement from './parcElement.js'
import * as ticket from './ticket.js'
import { clearDropdownCache } from './dropdowns.js'

// Petite fonction utilitaire : recupere une liste puis supprime chaque element.
async function supprimerTout(nom, service, log) {
  const elements = await service.getAll()
  for (const element of elements) {
    await service.remove(element.id)
    log('  - ' + nom + ' supprime : ' + (element.name || element.id))
  }
  return elements.length
}

// Adapte parcElement.js (qui a besoin de l'itemtype a chaque appel) au format
// attendu par supprimerTout (un service avec juste getAll/remove).
function servicePourType(itemtype) {
  return {
    getAll: () => parcElement.getAll(itemtype),
    remove: (id) => parcElement.remove(itemtype, id)
  }
}

export async function resetAll(log = () => {}) {
  log('Debut de la reinitialisation...')

  // On supprime d'abord les tickets (ils dependent des materiels),
  // puis chaque type d'element du parc (Computer, Monitor, ...).
  const tickets = await supprimerTout('Ticket', ticket, log)

  const materiels = {}
  for (const def of parcElement.TYPES) {
    try {
      materiels[def.itemtype] = await supprimerTout(def.label, servicePourType(def.itemtype), log)
    } catch (e) {
      // Un type non listable dans ce GLPI est ignore (on continue le reset).
      log('  (type ' + def.itemtype + ' ignore : ' + e.message + ')')
      materiels[def.itemtype] = 0
    }
  }

  // Les identifiants des dropdowns ne sont plus valables : on vide le cache.
  clearDropdownCache()

  log('Reinitialisation terminee.')
  return { tickets, materiels }
}
