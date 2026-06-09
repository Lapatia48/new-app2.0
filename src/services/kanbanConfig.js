// ============================================================================
// kanbanConfig.js
// ----------------------------------------------------------------------------
// Service qui va chercher la PERSONNALISATION du tableau Kanban (couleurs de
// fond + noms de statut en malgache) aupres du backend Spring Boot du dossier
// "eval". Ces valeurs sont stockees dans une base SQLite cote backend.
//
// Contrairement aux autres services (qui parlent a GLPI via api.js), celui-ci
// parle a NOTRE backend Spring Boot. On utilise donc directement "fetch" vers
// son adresse, definie dans le fichier .env (VITE_KANBAN_CONFIG_BASE).
// ============================================================================

// Adresse du backend Spring Boot. Par defaut http://localhost:8080 (port
// standard de Spring Boot lance avec "mvnw spring-boot:run").
const BASE = import.meta.env.VITE_KANBAN_CONFIG_BASE || 'http://localhost:8080'

const ENDPOINT = BASE + '/api/kanban-config'

// Configuration de secours utilisee SI le backend Spring Boot n'est pas lance
// (couleurs proches de l'image + traductions par defaut). Ainsi le tableau
// Kanban reste utilisable meme sans le backend.
const CONFIG_PAR_DEFAUT = {
  couleurNouveau: '#dbeafe',
  couleurEncours: '#fde7c8',
  couleurTermine: '#d7f0dc',
  nomMgNouveau: 'vaovao',
  nomMgEncours: 'efa manao',
  nomMgTermine: 'vita',
  langue: 'mg'
}

// Lit la configuration. En cas d'erreur reseau (backend eteint), on renvoie
// la config par defaut au lieu de planter la page.
export async function getConfig() {
  try {
    const reponse = await fetch(ENDPOINT)
    if (!reponse.ok) return CONFIG_PAR_DEFAUT
    return await reponse.json()
  } catch (e) {
    return CONFIG_PAR_DEFAUT
  }
}
