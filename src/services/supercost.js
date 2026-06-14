const BASE = import.meta.env.VITE_KANBAN_CONFIG_BASE || 'http://localhost:8080'
const ENDPOINT = BASE + '/api/supercost'

export async function getAll() {
  try {
    const reponse = await fetch(ENDPOINT)
    if (!reponse.ok) return []
    return await reponse.json()
  } catch (e) {
    return []
  }
}

export async function save(ticketsId, supercost) {
  const reponse = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketsId, supercost })
  })
  if (!reponse.ok) throw new Error('Enregistrement du supercost impossible (HTTP ' + reponse.status + ')')
  return await reponse.json()
}

// Reouverture d'un ticket termine : facture un frais valant "pourcentage" %
// de l'ancien supercost. Le calcul est fait cote backend.
export async function reouvrir(ticketsId, pourcentage) {
  const reponse = await fetch(ENDPOINT + '/' + ticketsId + '/reouverture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pourcentage: Number(pourcentage) })
  })
  if (!reponse.ok) throw new Error('Reouverture impossible (HTTP ' + reponse.status + ')')
  return await reponse.json()
}

// Annulation : retire le dernier cout de cloture du ticket (calcul cote backend).
export async function annuler(ticketsId) {
  const reponse = await fetch(ENDPOINT + '/' + ticketsId + '/annulation', { method: 'POST' })
  if (!reponse.ok) throw new Error('Annulation impossible (HTTP ' + reponse.status + ')')
  const texte = await reponse.text()
  return texte ? JSON.parse(texte) : null
}
