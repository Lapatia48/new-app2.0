// ============================================================================
// mouvement.js
// ----------------------------------------------------------------------------
// SOURCE DE VERITE UNIQUE des "mouvements" d'un ticket : reouverture,
// annulation et cloture.
//
// Utilisee A LA FOIS par :
//   - l'interface  : TicketkabanPage.vue (glisser-deposer entre colonnes)
//   - l'import CSV : MouvementImportPage.vue
//
// But : ne PAS dupliquer la logique metier (quel cout + quel statut pour chaque
// mouvement). Si la regle change un jour (autre statut, etape en plus...),
// on ne la modifie QU'ICI et les deux ecrans en profitent.
// ============================================================================

import * as ticket from './ticket.js'
import * as supercost from './supercost.js'

export const STATUT_ENCOURS = 2
export const STATUT_TERMINE = 6

// Reouverture : on facture le pourcentage d'un cout de base (calcul backend),
// puis le ticket repasse "In progress". Le "mode" (1 a 4) choisit ce cout de
// base : 1 = dernier, 2 = premier, 3 = moyenne, 4 = somme des couts.
export async function reouvrir(id, pourcentage, mode = 1) {
  await supercost.reouvrir(id, pourcentage, mode)
  await ticket.update(id, { status: STATUT_ENCOURS })
}

// Annulation : on retire le dernier cout de cloture (calcul backend),
// puis le ticket repasse "In progress".
export async function annuler(id) {
  await supercost.annuler(id)
  await ticket.update(id, { status: STATUT_ENCOURS })
}

// Cloture : si un cout est fourni (valeur non vide), on l'enregistre,
// puis le ticket passe "Termine". "cout" doit deja etre un nombre (ou '' si
// absent) : la conversion du format d'entree (virgule decimale du CSV, champ
// du formulaire...) reste a la charge de l'appelant.
export async function cloturer(id, cout) {
  if (cout !== '' && cout != null) await supercost.save(id, cout)
  await ticket.update(id, { status: STATUT_TERMINE })
}
