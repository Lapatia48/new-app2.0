import { ensureAccessToken } from './auth'
import { getAccessToken, getApiBaseUrl } from './tokenStore'

const appToken = import.meta.env.VITE_GLPI_APP_TOKEN || ''

function buildUrl(path) {
  const baseUrl = getApiBaseUrl()
  if (!path) {
    return baseUrl
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}

export async function request(method, path, options = {}) {
  const { body, headers = {}, isFormData = false, signal } = options
  await ensureAccessToken()
  const token = getAccessToken()
  const requestHeaders = {
    Accept: 'application/json',
    ...headers
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  if (appToken) {
    requestHeaders['App-Token'] = appToken
  }

  if (body && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    signal
  })

  const text = await response.text()
  const data = text ? safeJsonParse(text) : null

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText
    throw new Error(message || 'GLPI API error')
  }

  return data
}

export const glpiClient = {
  get(path, options) {
    return request('GET', path, options)
  },
  post(path, body, options) {
    return request('POST', path, { ...options, body })
  },
  put(path, body, options) {
    return request('PUT', path, { ...options, body })
  },
  delete(path, options) {
    return request('DELETE', path, options)
  }
}
