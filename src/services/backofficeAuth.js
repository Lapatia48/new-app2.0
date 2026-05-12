const storageKey = 'new-app2-backoffice-auth'

function getDefaultCredentials() {
  return {
    login: (import.meta.env.VITE_BACKOFFICE_LOGIN || 'admin').trim(),
    password: (import.meta.env.VITE_BACKOFFICE_PASSWORD || 'admin').trim()
  }
}

export function isBackOfficeAuthenticated() {
  return localStorage.getItem(storageKey) === 'true'
}

export function loginBackOffice(login, password) {
  const credentials = getDefaultCredentials()
  const normalizedLogin = String(login || '').trim()
  const normalizedPassword = String(password || '').trim()

  if (normalizedLogin !== credentials.login || normalizedPassword !== credentials.password) {
    return false
  }

  localStorage.setItem(storageKey, 'true')
  return true
}

export function logoutBackOffice() {
  localStorage.removeItem(storageKey)
}

export function getBackOfficeDefaults() {
  return getDefaultCredentials()
}