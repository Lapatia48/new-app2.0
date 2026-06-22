const BASE = import.meta.env.VITE_KANBAN_CONFIG_BASE || 'http://localhost:8080'
const ENDPOINT = BASE + '/api/supercost'

// ============================================
// 1. Récupérer tous les supercosts (totaux cumulés par ticket)
// ============================================
export async function getAll() {
  try {
    const reponse = await fetch(ENDPOINT)
    if (!reponse.ok) return []
    return await reponse.json()
  } catch (e) {
    console.error('Erreur getAll:', e)
    return []
  }
}

// ============================================
// 2. Récupérer TOUTES les clôtures individuelles
// ============================================
export async function getAllClotures() {
  try {
    const response = await fetch(ENDPOINT + '/clotures')
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Erreur getAllClotures:', e)
    return []
  }
}

// ============================================
// 3. Récupérer TOUTES les réouvertures
// ============================================
export async function getAllReouvertures() {
  try {
    const response = await fetch(ENDPOINT + '/reouvertures')
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Erreur getAllReouvertures:', e)
    return []
  }
}

// ============================================
// 4. Modifier le pourcentage d'une réouverture
// ============================================
export async function modifierPourcentageReouverture(id, nouveauPourcentage) {
  const response = await fetch(ENDPOINT + '/reouverture/' + id + '/pourcentage', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      pourcentage: Number(nouveauPourcentage) 
    })
  })
  if (!response.ok) {
    throw new Error('Modification pourcentage impossible (HTTP ' + response.status + ')')
  }
  return await response.json()
}

// ============================================
// 5. Modifier une réouverture (pourcentage ET mode)
// ============================================
export async function modifierReouverture(id, pourcentage, mode) {
  const response = await fetch(ENDPOINT + '/reouverture/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pourcentage: Number(pourcentage),
      mode: Number(mode)
    })
  })
  if (!response.ok) {
    throw new Error('Modification réouverture impossible (HTTP ' + response.status + ')')
  }
  return await response.json()
}

// ============================================
// 6. Modifier le montant d'un supercost
// ============================================
export async function modifierSupercost(ticketsId, nouveauMontant) {
  const response = await fetch(ENDPOINT + '/' + ticketsId + '/supercost', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      montant: Number(nouveauMontant)
    })
  })
  if (!response.ok) {
    throw new Error('Modification supercost impossible (HTTP ' + response.status + ')')
  }
  return await response.json()
}

// ============================================
// 7. Enregistrer une clôture (supercost)
// ============================================
export async function save(ticketsId, supercost) {
  const reponse = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketsId, supercost })
  })
  if (!reponse.ok) {
    throw new Error('Enregistrement du supercost impossible (HTTP ' + reponse.status + ')')
  }
  return await reponse.json()
}

// ============================================
// 8. Réouvrir un ticket avec mode et pourcentage
// ============================================
export async function reouvrir(ticketsId, pourcentage, mode) {
  const reponse = await fetch(ENDPOINT + '/' + ticketsId + '/' + mode + '/reouverture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'},
    body: JSON.stringify({ pourcentage: Number(pourcentage) })
  })
  if (!reponse.ok) {
    throw new Error('Reouverture impossible (HTTP ' + reponse.status + ')')
  }
  return await reponse.json()
}

// ============================================
// 9. Annuler le dernier coût d'un ticket
// ============================================
export async function annuler(ticketsId) {
  const reponse = await fetch(ENDPOINT + '/' + ticketsId + '/annulation', { 
    method: 'POST' 
  })
  if (!reponse.ok) {
    throw new Error('Annulation impossible (HTTP ' + reponse.status + ')')
  }
  const texte = await reponse.text()
  return texte ? JSON.parse(texte) : null
}

// ============================================
// 10. Récupérer l'historique d'un ticket
// ============================================
export async function getHistorique(ticketsId) {
  try {
    const response = await fetch(ENDPOINT + '/' + ticketsId + '/historique')
    if (!response.ok) return []
    return await response.json()
  } catch (e) {
    console.error('Erreur getHistorique:', e)
    return []
  }
}