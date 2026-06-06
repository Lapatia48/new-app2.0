// ============================================================================
// api.js
// ----------------------------------------------------------------------------
// Petit client pour parler a l'API GLPI (version 2.3).
// Il s'occupe de :
//   1. recuperer un token (connexion avec login / mot de passe)
//   2. proposer 4 fonctions simples : get, post, patch, del
//
// Toutes les autres fichiers "services" (computer.js, ticket.js ...) utilisent
// ces fonctions. On ne reecrit donc jamais "fetch" ailleurs.
// ============================================================================

// Adresse de base de l'API (voir le fichier .env).
const BASE = import.meta.env.VITE_GLPI_BASE

// On garde le token en memoire pour ne pas le redemander a chaque appel.
let accessToken = null
let tokenExpireAt = 0 // date (en millisecondes) a laquelle le token expire

// ----------------------------------------------------------------------------
// getToken : recupere un token GLPI (et en redemande un quand il est expire).
// ----------------------------------------------------------------------------
export async function getToken() {
  const now = Date.now()

  // Si on a deja un token encore valide, on le reutilise.
  if (accessToken && now < tokenExpireAt) {
    return accessToken
  }

  // Le endpoint token attend un formulaire (x-www-form-urlencoded), pas du JSON.
  const body = new URLSearchParams()
  body.set('grant_type', 'password')
  body.set('client_id', import.meta.env.VITE_GLPI_CLIENT_ID)
  body.set('client_secret', import.meta.env.VITE_GLPI_CLIENT_SECRET)
  body.set('username', import.meta.env.VITE_GLPI_USERNAME)
  body.set('password', import.meta.env.VITE_GLPI_PASSWORD)
  body.set('scope', 'api')

  const response = await fetch(BASE + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!response.ok) {
    throw new Error('Impossible de recuperer le token GLPI (HTTP ' + response.status + ')')
  }

  const data = await response.json()
  accessToken = data.access_token
  // On enleve 60 secondes par securite pour eviter d'utiliser un token "limite".
  tokenExpireAt = now + (data.expires_in - 60) * 1000

  return accessToken
}

// ----------------------------------------------------------------------------
// request : fonction interne utilisee par get / post / patch / del.
// "path" est par exemple "/Assets/Computer".
// ----------------------------------------------------------------------------
async function request(method, path, body) {
  const token = await getToken()

  const options = {
    method,
    headers: {
      Authorization: 'Bearer ' + token
    }
  }

  // On n'envoie un corps (et l'en-tete Content-Type) que pour POST et PATCH.
  // Important : sur un GET/DELETE sans corps, envoyer "Content-Type: application/json"
  // fait croire a GLPI qu'un JSON est present et provoque une erreur 400.
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const response = await fetch(BASE + path, options)

  if (!response.ok) {
    const texte = await response.text()
    throw new Error(method + ' ' + path + ' a echoue (HTTP ' + response.status + ') : ' + texte)
  }

  // Certaines reponses (DELETE par exemple) sont vides : on protege le .json().
  const texte = await response.text()
  return texte ? JSON.parse(texte) : null
}

// ----------------------------------------------------------------------------
// Les 4 fonctions publiques, volontairement tres simples.
// ----------------------------------------------------------------------------
export function get(path) {
  return request('GET', path)
}

export function post(path, body) {
  return request('POST', path, body)
}

export function patch(path, body) {
  return request('PATCH', path, body)
}

export function del(path) {
  return request('DELETE', path)
}
