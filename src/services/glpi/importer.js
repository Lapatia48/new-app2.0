import { csvEntities } from './entities'
import { fetchCsvRows, parseCsvFile } from './csv'
import { createEntity } from './crud'
import { glpiClient } from './client'

function emitProgress(onProgress, payload) {
  if (typeof onProgress === 'function') {
    onProgress(payload)
  }
}

function extractId(result) {
  if (!result) {
    return null
  }

  return result.id || result?.data?.id || result?.result?.id || null
}

function buildImageUrl(imageConfig, fileName) {
  if (!imageConfig?.basePath || !fileName) {
    return ''
  }

  const normalizedBase = imageConfig.basePath.replace(/\/+$/, '')
  return `${normalizedBase}/${fileName}`
}

async function uploadImage(imageConfig, fileName) {
  if (!imageConfig?.endpoint || !fileName) {
    return null
  }

  const imageUrl = buildImageUrl(imageConfig, fileName)
  if (!imageUrl) {
    return null
  }

  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Image introuvable: ${imageUrl}`)
  }

  const blob = await response.blob()
  const formData = new FormData()
  formData.append('file', blob, fileName)

  return glpiClient.post(imageConfig.endpoint, formData, { isFormData: true })
}

async function uploadImageFile(imageConfig, file) {
  if (!imageConfig?.endpoint || !file) {
    return null
  }

  const formData = new FormData()
  formData.append('file', file, file.name)

  return glpiClient.post(imageConfig.endpoint, formData, { isFormData: true })
}

function buildFileIndex(files) {
  const index = new Map()
  if (!files) {
    return index
  }

  const list = Array.isArray(files) ? files : Object.values(files)
  list.forEach((file) => {
    if (!file?.name) {
      return
    }

    index.set(file.name, file)
    index.set(file.name.toLowerCase(), file)
  })

  return index
}

async function importRows(entity, rows, imageIndex, onProgress) {
  let createdCount = 0

  for (const row of rows) {
    const payload = entity.mapRowToPayload ? entity.mapRowToPayload(row) : row
    emitProgress(onProgress, {
      type: 'info',
      message: `Creation ${entity.label}...`
    })

    const result = await createEntity(entity.endpoint, payload)
    createdCount += 1

    const imageFileName = entity.image?.column ? row[entity.image.column] : ''
    if (imageFileName && entity.image) {
      const imageFile = imageIndex?.get(imageFileName) || imageIndex?.get(String(imageFileName).toLowerCase())
      if (imageFile) {
        emitProgress(onProgress, {
          type: 'info',
          message: `Upload image: ${imageFileName}`
        })
        await uploadImageFile(entity.image, imageFile)
      } else {
        emitProgress(onProgress, {
          type: 'info',
          message: `Image introuvable: ${imageFileName}`
        })
      }
    }

    const entityId = extractId(result)
    if (entityId) {
      emitProgress(onProgress, {
        type: 'success',
        message: `${entity.label} cree (id: ${entityId})`
      })
    }
  }

  return createdCount
}

export async function importData({ onProgress } = {}) {
  const summary = []

  for (const entity of csvEntities) {
    emitProgress(onProgress, {
      type: 'info',
      message: `Lecture CSV: ${entity.label}`
    })

    const rows = await fetchCsvRows(entity.csvPath)
    const createdCount = await importRows(entity, rows, null, onProgress)

    summary.push({ key: entity.key, created: createdCount })
    emitProgress(onProgress, {
      type: 'success',
      message: `${entity.label}: ${createdCount} elements importes`
    })
  }

  return summary
}

export async function importDataFromFiles({ files, onProgress } = {}) {
  const summary = []
  const csvIndex = buildFileIndex(files?.csvFiles)
  const imageIndex = buildFileIndex(files?.imageFiles)

  for (const entity of csvEntities) {
    emitProgress(onProgress, {
      type: 'info',
      message: `Lecture CSV: ${entity.label}`
    })

    const fileName = entity.csvFileName
    const csvFile = fileName ? csvIndex.get(fileName) || csvIndex.get(fileName.toLowerCase()) : null
    if (!csvFile) {
      emitProgress(onProgress, {
        type: 'error',
        message: `CSV manquant pour ${entity.label}: ${fileName || 'inconnu'}`
      })
      summary.push({ key: entity.key, created: 0 })
      continue
    }

    const rows = await parseCsvFile(csvFile)
    const createdCount = await importRows(entity, rows, imageIndex, onProgress)

    summary.push({ key: entity.key, created: createdCount })
    emitProgress(onProgress, {
      type: 'success',
      message: `${entity.label}: ${createdCount} elements importes`
    })
  }

  return summary
}
