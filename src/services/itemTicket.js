// ============================================================================
// itemTicket.js  (API v1)
// ----------------------------------------------------------------------------
// Lien REEL entre un ticket et un materiel (ordinateur, ecran, ...).
// En GLPI, ce lien est l'itemtype "Item_Ticket" (table glpi_items_tickets) :
//   - tickets_id : l'id du ticket
//   - itemtype   : "Computer" ou "Monitor"
//   - items_id   : l'id du materiel
// ============================================================================

import { get, post } from './api.js'

const ENDPOINT = '/Item_Ticket'

// Rattache un materiel a un ticket.
export function create(ticketId, itemtype, itemsId) {
  return post(ENDPOINT, {
    tickets_id: ticketId,
    itemtype,
    items_id: itemsId
  })
}

// Liste les materiels rattaches a un ticket (sous-items : /Ticket/{id}/Item_Ticket).
export function getAllForTicket(ticketId) {
  return get('/Ticket/' + ticketId + '/Item_Ticket')
}
