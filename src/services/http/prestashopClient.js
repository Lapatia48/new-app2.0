const baseUrl = (import.meta.env.VITE_PS_API_BASE_URL || '').trim()
const apiKey = (import.meta.env.VITE_PS_API_KEY || '').trim()

function ensureConfig() {
  if (!baseUrl) {
    throw new Error('VITE_PS_API_BASE_URL is missing')
  }
  if (!apiKey) {
    throw new Error('VITE_PS_API_KEY is missing')
  }
}

function resolveBaseUrl(rawBase) {
  const trimmed = rawBase.trim()
  const absolute = trimmed.startsWith('http')
    ? trimmed
    : `${window.location.origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
  const parsed = new URL(absolute)
  const pathname = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.origin}${pathname}`
}

function buildUrl(path, query) {
  ensureConfig()
  const normalizedBase = resolveBaseUrl(baseUrl)
  const normalizedPath = path.replace(/^\/+/, '')
  const url = new URL(`${normalizedBase}/${normalizedPath}`)
  if (apiKey && !url.searchParams.has('ws_key')) {
    url.searchParams.set('ws_key', apiKey)
  }
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return
      }
      url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

function buildHeaders(hasBody) {
  const headers = new Headers()
  headers.set('Accept', 'application/xml')
  if (hasBody) {
    headers.set('Content-Type', 'application/xml')
  }
  return headers
}

async function requestXml(path, options = {}) {
  const url = buildUrl(path, options.query)
  const method = options.method || 'GET'
  const body = options.body
  const headers = buildHeaders(Boolean(body))
  const response = await fetch(url, { method, headers, body })
  const text = await response.text()
  if (!response.ok) {
    if (options.ignore404 && response.status === 404) {
      return ''
    }
    throw new Error(`PrestaShop API error ${response.status}: ${text}`)
  }
  return text
}

export function getXml(path, query) {
  return requestXml(path, { method: 'GET', query })
}

export function postXml(path, body, query) {
  return requestXml(path, { method: 'POST', body, query })
}

export function putXml(path, body, query) {
  return requestXml(path, { method: 'PUT', body, query })
}

export function deleteXml(path, query, ignore404 = false) {
  return requestXml(path, { method: 'DELETE', query, ignore404 })
}

export function buildApiUrl(path, query) {
  return buildUrl(path, query)
}
