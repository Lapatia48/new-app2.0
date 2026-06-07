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

// Ajoute un cout. "input" doit contenir tickets_id + actiontime, cost_time, ...
export function create(input) {
  return post(ENDPOINT, input)
}
