import {
  getAccessToken,
  getApiBaseUrl,
  getRefreshToken,
  isTokenExpired,
  setTokens
} from './tokenStore'

function buildTokenUrl() {
  const envUrl = import.meta.env.VITE_GLPI_TOKEN_URL
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }

  return `${getApiBaseUrl()}/token`
}

function getAuthConfig() {
  return {
    grantType: import.meta.env.VITE_GLPI_GRANT_TYPE || 'password',
    clientId: import.meta.env.VITE_GLPI_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GLPI_CLIENT_SECRET || '',
    username: import.meta.env.VITE_GLPI_USERNAME || '',
    password: import.meta.env.VITE_GLPI_PASSWORD || '',
    scope: import.meta.env.VITE_GLPI_SCOPE || 'api'
  }
}

function toFormUrlEncoded(payload) {
  const search = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  })
  return search.toString()
}

async function requestToken(payload) {
  const response = await fetch(buildTokenUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: toFormUrlEncoded(payload)
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.error_description || data?.message || data?.error
    throw new Error(message || 'Token GLPI indisponible')
  }

  if (data?.access_token) {
    setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    })
  }

  return data
}

export async function ensureAccessToken({ force = false } = {}) {
  if (!force && !isTokenExpired()) {
    return getAccessToken()
  }

  const config = getAuthConfig()
  const refreshToken = getRefreshToken()

  if (config.grantType === 'password') {
    if (!config.clientId || !config.clientSecret || !config.username || !config.password) {
      throw new Error('Config GLPI manquante pour recuperer le token')
    }

    const data = await requestToken({
      grant_type: 'password',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
      scope: config.scope
    })

    return data?.access_token || getAccessToken()
  }

  if (refreshToken) {
    const data = await requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: config.scope
    })

    return data?.access_token || getAccessToken()
  }

  throw new Error('Token GLPI manquant')
}
