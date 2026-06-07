// ============================================================================
// api.js  (API REST GLPI "v1" : apirest.php)
// ----------------------------------------------------------------------------
// Ce client s'occupe de :
//   1. ouvrir une session (initSession) avec login / mot de passe
//      -> GLPI renvoie un "session_token" a utiliser partout ensuite
//   2. proposer des fonctions simples : get, post, put, del, postMultipart
//
// Tous les autres fichiers "services" (computer.js, ticket.js ...) utilisent
// ces fonctions. On ne reecrit donc jamais "fetch" ailleurs.
//
// A retenir sur l'API v1 :
//   - on s'authentifie une fois (initSession), puis on envoie l'en-tete
//     "Session-Token" sur chaque appel ;
//   - pour creer/modifier, le corps doit etre { "input": { ...champs... } } ;
//   - une liste GET renvoie directement un tableau JSON.
// ============================================================================

const BASE = import.meta.env.VITE_GLPI_BASE
const APP_TOKEN = import.meta.env.VITE_GLPI_APP_TOKEN // souvent vide

// On garde le token de session en memoire pour ne pas se reconnecter a chaque appel.
let sessionToken = null

// ----------------------------------------------------------------------------
// En-tetes communs a tous les appels (Session-Token + App-Token si present).
// ----------------------------------------------------------------------------
function entetes(supplementaires = {}) {
  const h = { ...supplementaires }
  if (sessionToken) h['Session-Token'] = sessionToken
  if (APP_TOKEN) h['App-Token'] = APP_TOKEN
  return h
}

// ----------------------------------------------------------------------------
// initSession : ouvre une session et recupere le session_token.
// Authentification "Basic" = Base64("login:password").
// ----------------------------------------------------------------------------
export async function initSession() {
  const login = import.meta.env.VITE_GLPI_USERNAME
  const password = import.meta.env.VITE_GLPI_PASSWORD
  const basic = btoa(login + ':' + password)

  const response = await fetch(BASE + '/initSession', {
    method: 'GET',
    headers: entetes({
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + basic
    })
  })

  if (!response.ok) {
    throw new Error('initSession a echoue (HTTP ' + response.status + ') : ' + (await response.text()))
  }

  const data = await response.json()
  sessionToken = data.session_token
  return sessionToken
}

// Renvoie un token valide (ouvre la session la premiere fois).
async function getSession() {
  if (!sessionToken) {
    await initSession()
  }
  return sessionToken
}

// ----------------------------------------------------------------------------
// request : fonction interne utilisee par get / post / put / del.
// "input" (optionnel) est l'objet metier ; on l'emballe dans { input: ... }.
// ----------------------------------------------------------------------------
async function request(method, path, input) {
  await getSession()

  const options = { method, headers: entetes() }

  // Corps JSON uniquement pour les ecritures (POST / PUT).
  if (input !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify({ input })
  }

  let response = await fetch(BASE + path, options)

  // Si la session a expire, on se reconnecte une fois et on reessaie.
  if (response.status === 401) {
    await initSession()
    options.headers = { ...options.headers, ...entetes() }
    response = await fetch(BASE + path, options)
  }

  if (!response.ok) {
    throw new Error(method + ' ' + path + ' a echoue (HTTP ' + response.status + ') : ' + (await response.text()))
  }

  // DELETE renvoie parfois un corps vide (204) : on protege le JSON.parse.
  const texte = await response.text()
  return texte ? JSON.parse(texte) : null
}

// ----------------------------------------------------------------------------
// Fonctions publiques.
// ----------------------------------------------------------------------------
export function get(path) {
  return request('GET', path)
}

export function post(path, input) {
  return request('POST', path, input)
}

export function put(path, input) {
  return request('PUT', path, input)
}

export function del(path) {
  return request('DELETE', path)
}

// ----------------------------------------------------------------------------
// postMultipart : envoi de fichier (upload de Document).
// On laisse le navigateur poser le bon Content-Type (avec la "boundary"),
// donc on ne le met PAS nous-memes.
// ----------------------------------------------------------------------------
export async function postMultipart(path, formData) {
  await getSession()

  let response = await fetch(BASE + path, {
    method: 'POST',
    headers: entetes(), // pas de Content-Type ici
    body: formData
  })

  if (response.status === 401) {
    await initSession()
    response = await fetch(BASE + path, {
      method: 'POST',
      headers: entetes(),
      body: formData
    })
  }

  if (!response.ok) {
    throw new Error('Upload ' + path + ' a echoue (HTTP ' + response.status + ') : ' + (await response.text()))
  }

  const texte = await response.text()
  return texte ? JSON.parse(texte) : null
}
