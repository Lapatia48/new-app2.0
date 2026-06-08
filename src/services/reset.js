// ============================================================================
// reset.js
// ----------------------------------------------------------------------------
// Reinitialise les donnees : on supprime DEFINITIVEMENT tout ce qui a ete
// importe (tickets + tous les types d'elements du parc listes dans
// parc/index.js + les utilisateurs crees par l'import). Les couts d'un ticket
// sont supprimes automatiquement en meme temps que le ticket.
//
// ATTENTION utilisateurs : on ne supprime QUE ceux crees par l'import (repere
// par leur "comment", cf user.js). Les comptes systeme (glpi, tech...) sont
// epargnes.
//
// "log" est une fonction optionnelle pour afficher l'avancement a l'ecran.
// ============================================================================

import { ELEMENTS } from './parc/index.js'
import * as ticket from './ticket.js'
import User from './user.js'
import { clearDropdownCache } from './dropdowns.js'

// Supprime tous les tickets (service "classique" avec getAll/remove).
async function supprimerTickets(log) {
  const tickets = await ticket.getAll()
  for (const t of tickets) {
    await ticket.remove(t.id)
    log('  - Ticket supprime : ' + (t.name || t.id))
  }
  return tickets.length
}

// Supprime tous les elements d'un type donne (une classe de parc/index.js).
async function supprimerElements(Element, log) {
  const bruts = await Element.getAll()
  for (const brut of bruts) {
    await Element.remove(brut.id)
    log('  - ' + Element.label + ' supprime : ' + (brut.name || brut.designation || brut.id))
  }
  return bruts.length
}

export async function resetAll(log = () => {}) {
  log('Debut de la reinitialisation...')

  // On supprime d'abord les tickets (ils dependent des materiels),
  // puis chaque type d'element du parc (Computer, Monitor, Cable...).
  const tickets = await supprimerTickets(log)

  const materiels = {}
  for (const Element of ELEMENTS) {
    try {
      materiels[Element.itemtype] = await supprimerElements(Element, log)
    } catch (e) {
      // Un type non listable dans ce GLPI est ignore (on continue le reset).
      log('  (type ' + Element.itemtype + ' ignore : ' + e.message + ')')
      materiels[Element.itemtype] = 0
    }
  }

  // Suppression des utilisateurs crees par l'import (les comptes systeme glpi,
  // tech... sont epargnes car ils n'ont pas la marque IMPORT_TAG).
  const utilisateurs = await User.removeImported(log)

  // Les identifiants des dropdowns et des utilisateurs ne sont plus valables :
  // on vide les caches.
  clearDropdownCache()
  User.clearCache()

  log('Reinitialisation terminee.')
  return { tickets, materiels, utilisateurs }
}
