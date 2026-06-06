// ============================================================================
// ticketCost.js
// ----------------------------------------------------------------------------
// Service pour les "couts" d'un ticket de GLPI.
// Particularite : un cout appartient toujours a un ticket, donc l'URL contient
// l'id du ticket :  /Assistance/Ticket/{ticketId}/Cost
// ============================================================================

import { get, post, del } from './api.js'

function endpoint(ticketId) {
  return '/Assistance/Ticket/' + ticketId + '/Cost'
}

// Liste les couts d'un ticket.
export function getAll(ticketId) {
  return get(endpoint(ticketId))
}

// Ajoute un cout a un ticket.
export function create(ticketId, body) {
  return post(endpoint(ticketId), body)
}

// Supprime un cout d'un ticket.
export function remove(ticketId, costId) {
  return del(endpoint(ticketId) + '/' + costId + '?force=true')
}
