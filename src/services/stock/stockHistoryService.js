const STORAGE_KEY = 'new-app2-stock-history'

function loadEntries() {
  if (typeof localStorage === 'undefined') {
    return []
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function saveEntries(entries) {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function buildId(timestamp) {
  return `${timestamp}-${Math.random().toString(16).slice(2, 8)}`
}

function normalizeText(value) {
  return String(value || '').trim()
}

export function recordStockMovement({
  reference,
  productId,
  productName,
  specificite,
  karazany,
  delta,
  previousQty,
  nextQty
}) {
  const timestamp = new Date().toISOString()
  const entry = {
    id: buildId(timestamp),
    timestamp,
    date: timestamp.slice(0, 10),
    reference: normalizeText(reference),
    productId: Number(productId) || null,
    productName: normalizeText(productName),
    specificite: normalizeText(specificite),
    karazany: normalizeText(karazany),
    delta: Number(delta) || 0,
    previousQty: Number.isFinite(Number(previousQty)) ? Number(previousQty) : null,
    nextQty: Number.isFinite(Number(nextQty)) ? Number(nextQty) : null
  }

  const entries = loadEntries()
  entries.unshift(entry)
  saveEntries(entries)
  return entry
}

export function listStockHistory({ reference, productId } = {}) {
  const normalizedRef = normalizeText(reference)
  const normalizedId = Number(productId) || null
  const entries = loadEntries()

  return entries.filter((entry) => {
    if (normalizedRef && entry.reference !== normalizedRef) {
      return false
    }
    if (normalizedId && entry.productId !== normalizedId) {
      return false
    }
    return true
  })
}

export function buildDailyStockSummary(entries) {
  const sorted = [...entries].sort((a, b) => {
    const aTime = Date.parse(a.timestamp)
    const bTime = Date.parse(b.timestamp)
    return aTime - bTime
  })

  const map = new Map()

  sorted.forEach((entry) => {
    const key = entry.date || 'Sans date'
    const existing = map.get(key)

    if (!existing) {
      map.set(key, {
        date: key,
        events: 1,
        delta: entry.delta || 0,
        startQty: entry.previousQty,
        endQty: entry.nextQty
      })
      return
    }

    existing.events += 1
    existing.delta += entry.delta || 0
    existing.endQty = entry.nextQty
    map.set(key, existing)
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.date === 'Sans date') return 1
    if (b.date === 'Sans date') return -1
    return a.date < b.date ? 1 : -1
  })
}
