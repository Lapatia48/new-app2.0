import { csvEntities } from './entities'
import { fetchCsvRows } from './csv'
import { deleteEntity, listEntities } from './crud'

function emitProgress(onProgress, payload) {
  if (typeof onProgress === 'function') {
    onProgress(payload)
  }
}

function normalizeList(result) {
  if (Array.isArray(result)) {
    return result
  }

  if (Array.isArray(result?.data)) {
    return result.data
  }

  if (Array.isArray(result?.items)) {
    return result.items
  }

  return []
}

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value).trim().toLowerCase()
}

function buildDeleteIndex(rows, entity) {
  const matchers = Array.isArray(entity.deleteMatch) ? entity.deleteMatch : []
  if (!matchers.length) {
    return { matchers: [], valuesByKey: new Map() }
  }

  const valuesByKey = new Map()

  for (const matcher of matchers) {
    const payloadKey = typeof matcher === 'string' ? matcher : matcher.payloadKey
    if (!payloadKey) {
      continue
    }

    valuesByKey.set(payloadKey, new Set())
  }

  for (const row of rows) {
    const payload = entity.mapRowToPayload ? entity.mapRowToPayload(row) : row
    for (const matcher of matchers) {
      const payloadKey = typeof matcher === 'string' ? matcher : matcher.payloadKey
      if (!payloadKey) {
        continue
      }

      const value = payload[payloadKey]
      if (Array.isArray(value)) {
        value.forEach((item) => valuesByKey.get(payloadKey).add(normalizeValue(item)))
      } else if (value !== undefined && value !== '') {
        valuesByKey.get(payloadKey).add(normalizeValue(value))
      }
    }
  }

  return { matchers, valuesByKey }
}

function shouldDeleteItem(item, matchers, valuesByKey) {
  return matchers.some((matcher) => {
    const payloadKey = typeof matcher === 'string' ? matcher : matcher.payloadKey
    const itemKey = typeof matcher === 'string' ? matcher : matcher.itemKey
    if (!payloadKey || !itemKey) {
      return false
    }

    const valueSet = valuesByKey.get(payloadKey)
    if (!valueSet || valueSet.size === 0) {
      return false
    }

    const itemValue = normalizeValue(item?.[itemKey])
    return valueSet.has(itemValue)
  })
}

export async function resetData({ onProgress } = {}) {
  const summary = []

  for (const entity of csvEntities) {
    emitProgress(onProgress, {
      type: 'info',
      message: `Chargement ${entity.label}...`
    })

    const rows = await fetchCsvRows(entity.csvPath)
    const { matchers, valuesByKey } = buildDeleteIndex(rows, entity)

    if (!matchers.length) {
      emitProgress(onProgress, {
        type: 'info',
        message: `${entity.label}: aucune regle de suppression definie`
      })
      summary.push({ key: entity.key, deleted: 0 })
      continue
    }

    const result = await listEntities(entity.endpoint, { range: '0-9999' })
    const items = normalizeList(result)
    let deletedCount = 0

    for (const item of items) {
      const id = item?.id || item?.ID || item?.Id
      if (!id) {
        continue
      }

      if (!shouldDeleteItem(item, matchers, valuesByKey)) {
        continue
      }

      emitProgress(onProgress, {
        type: 'info',
        message: `Suppression ${entity.label} (id: ${id})`
      })

      await deleteEntity(entity.endpoint, id)
      deletedCount += 1
    }

    summary.push({ key: entity.key, deleted: deletedCount })
    emitProgress(onProgress, {
      type: 'success',
      message: `${entity.label}: ${deletedCount} elements supprimes`
    })
  }

  return summary
}
