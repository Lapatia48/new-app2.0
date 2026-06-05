const ACCESS_TOKEN_KEY = 'glpi_access_token'
const REFRESH_TOKEN_KEY = 'glpi_refresh_token'
const EXPIRES_AT_KEY = 'glpi_access_expires_at'

function hasWindow() {
  return typeof window !== 'undefined'
}

function readStorage(key) {
  if (!hasWindow()) {
    return ''
  }

  try {
    return window.localStorage.getItem(key) || ''
  } catch (error) {
    return ''
  }
}

function writeStorage(key, value) {
  if (!hasWindow()) {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    // Ignore storage errors (private mode, disabled storage, etc.)
  }
}

function removeStorage(key) {
  if (!hasWindow()) {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    // Ignore storage errors (private mode, disabled storage, etc.)
  }
}

function readNumber(key) {
  const raw = readStorage(key)
  if (!raw) {
    return 0
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_GLPI_BASE_URL || 'http://glpi.local/api.php'
  return baseUrl.replace(/\/+$/, '')
}

export function getDataBaseUrl() {
  const baseUrl = import.meta.env.VITE_GLPI_DATA_BASE_URL || '/data'
  return baseUrl.replace(/\/+$/, '')
}

export function getAccessToken() {
  const storedToken = readStorage(ACCESS_TOKEN_KEY)
  const envToken = import.meta.env.VITE_GLPI_ACCESS_TOKEN || ''
  return storedToken || envToken
}

export function getRefreshToken() {
  const storedToken = readStorage(REFRESH_TOKEN_KEY)
  const envToken = import.meta.env.VITE_GLPI_REFRESH_TOKEN || ''
  return storedToken || envToken
}

export function setAccessToken(token) {
  if (!token) {
    removeStorage(ACCESS_TOKEN_KEY)
    return
  }

  writeStorage(ACCESS_TOKEN_KEY, token)
}

export function setRefreshToken(token) {
  if (!token) {
    removeStorage(REFRESH_TOKEN_KEY)
    return
  }

  writeStorage(REFRESH_TOKEN_KEY, token)
}

export function getExpiresAt() {
  return readNumber(EXPIRES_AT_KEY)
}

export function setExpiresAt(timestampMs) {
  if (!timestampMs) {
    removeStorage(EXPIRES_AT_KEY)
    return
  }

  writeStorage(EXPIRES_AT_KEY, String(timestampMs))
}

export function setTokens({ accessToken, refreshToken, expiresIn }) {
  if (accessToken) {
    setAccessToken(accessToken)
  }

  if (refreshToken) {
    setRefreshToken(refreshToken)
  }

  if (expiresIn) {
    const expiresAt = Date.now() + Number(expiresIn) * 1000
    setExpiresAt(expiresAt)
  }
}

export function clearTokens() {
  removeStorage(ACCESS_TOKEN_KEY)
  removeStorage(REFRESH_TOKEN_KEY)
  removeStorage(EXPIRES_AT_KEY)
}

export function isTokenExpired(bufferSeconds = 60) {
  const token = getAccessToken()
  if (!token) {
    return true
  }

  const expiresAt = getExpiresAt()
  if (!expiresAt) {
    return true
  }

  const now = Date.now() + bufferSeconds * 1000
  return now >= expiresAt
}

export function hasAccessToken() {
  return Boolean(getAccessToken()) && !isTokenExpired()
}
