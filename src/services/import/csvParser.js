import { normalizeHeader } from '@/services/utils/stringUtils'

export async function parseCsvFile(file, options = {}) {
  const text = await file.text()
  return parseCsvText(text, options)
}

export function parseCsvText(text, options = {}) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const filtered = lines.filter((line) => line.trim() !== '')
  if (!filtered.length) {
    throw new Error('CSV is empty')
  }

  const delimiter = options.delimiter ?? detectDelimiter(filtered[0])
  const headerLine = filtered[0].replace(/^\uFEFF/, '')
  const rawHeaders = parseLine(headerLine, delimiter)
  const normalizedHeaders = buildNormalizedHeaders(rawHeaders)
  const rows = []

  for (let i = 1; i < filtered.length; i += 1) {
    const values = parseLine(filtered[i], delimiter)
    if (!values.length) {
      continue
    }
    const row = {}
    normalizedHeaders.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? ''
    })
    rows.push(row)
  }

  return {
    delimiter,
    headers: rawHeaders,
    normalizedHeaders,
    rows
  }
}

function buildNormalizedHeaders(rawHeaders) {
  const seen = new Map()
  return rawHeaders.map((header, index) => {
    const base = normalizeHeader(header) || `col_${index + 1}`
    const count = seen.get(base) ?? 0
    const next = count ? `${base}_${count + 1}` : base
    seen.set(base, count + 1)
    return next
  })
}

function detectDelimiter(line) {
  const candidates = [';', ',', '\t']
  let best = ','
  let bestScore = -1

  for (const candidate of candidates) {
    const score = line.split(candidate).length - 1
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}

function parseLine(line, delimiter) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}
