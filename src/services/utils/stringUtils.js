export function normalizeHeader(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toFloat(value, fallback = 0) {
  const normalized = value.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toBool(value, fallback = false) {
  if (!value) {
    return fallback
  }
  const normalized = value.trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'on', 'oui', 'vrai'].includes(normalized)
}

export function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'item'
}
