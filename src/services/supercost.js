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
