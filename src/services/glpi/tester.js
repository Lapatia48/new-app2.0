import { csvEntities } from './entities'
import { glpiClient } from './client'

function emitProgress(onProgress, payload) {
  if (typeof onProgress === 'function') {
    onProgress(payload)
  }
}

function buildListUrl(endpoint) {
  const range = '0-0'
  return `${endpoint}?range=${range}`
}

export async function testGlpiApis({ onProgress } = {}) {
  const results = []

  emitProgress(onProgress, {
    type: 'info',
    message: 'Test API GLPI demarre'
  })

  for (const entity of csvEntities) {
    emitProgress(onProgress, {
      type: 'info',
      message: `Test GET ${entity.label}`
    })

    try {
      await glpiClient.get(buildListUrl(entity.endpoint))
      results.push({ key: entity.key, ok: true })
      emitProgress(onProgress, {
        type: 'success',
        message: `OK: ${entity.label}`
      })
    } catch (error) {
      results.push({ key: entity.key, ok: false, error: error?.message })
      emitProgress(onProgress, {
        type: 'error',
        message: `KO: ${entity.label} (${error?.message || 'erreur'})`
      })
    }
  }

  emitProgress(onProgress, {
    type: 'success',
    message: 'Test API GLPI termine'
  })

  return results
}
