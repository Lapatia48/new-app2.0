// ============================================================================
// ticketCost.js  (API v1)
// ----------------------------------------------------------------------------
// Service pour les "couts" d'un ticket (itemtype TicketCost de GLPI).
// En v1, le cout est un objet a part entiere qui pointe vers son ticket via le
// champ "tickets_id". On peut lister les couts d'un ticket via les sous-items.
// ============================================================================

import { get, post } from './api.js'

const ENDPOINT = '/TicketCost'

// Liste les couts d'un ticket (sous-items : /Ticket/{id}/TicketCost).
export function getAllForTicket(ticketId) {
  return get('/Ticket/' + ticketId + '/TicketCost')
}

// Ajoute un cout pour le ticket "ticketId". "champs" contient les autres
// proprietes (name, duration, cost_time, cost_fixed, ...) ; on y ajoute
// tickets_id pour rattacher le cout au bon ticket.
export function create(ticketId, champs) {
  return post(ENDPOINT, { ...champs, tickets_id: ticketId })
}
