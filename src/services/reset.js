// ============================================================================
// reset.js
// ----------------------------------------------------------------------------
// Reinitialise les donnees : on supprime DEFINITIVEMENT tout ce qui a ete
// importe (tickets, ordinateurs, ecrans). Les couts d'un ticket sont supprimes
// automatiquement en meme temps que le ticket.
//
// "log" est une fonction optionnelle pour afficher l'avancement a l'ecran.
// ============================================================================

import * as computer from './computer.js'
import * as monitor from './monitor.js'
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

export async function resetAll(log = () => {}) {
  log('Debut de la reinitialisation...')

  // On supprime d'abord les tickets (ils dependent des materiels),
  // puis les materiels.
  const tickets = await supprimerTout('Ticket', ticket, log)
  const computers = await supprimerTout('Ordinateur', computer, log)
  const monitors = await supprimerTout('Ecran', monitor, log)

  // Les identifiants des dropdowns ne sont plus valables : on vide le cache.
  clearDropdownCache()

  log('Reinitialisation terminee.')
  return { tickets, computers, monitors }
}
