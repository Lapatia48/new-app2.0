function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length
  const semicolonCount = (headerLine.match(/;/g) || []).length
  return semicolonCount > commaCount ? ';' : ','
}

function parseCsvRow(row, delimiter) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index]
    const nextChar = row[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
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
  return values
}

export function parseCsv(text) {
  if (!text) {
    return []
  }

  const normalized = text.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/).filter(Boolean)
  if (!lines.length) {
    return []
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvRow(lines[0], delimiter).map((header) => header.trim())
  const rows = []

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvRow(lines[index], delimiter)
    const row = {}

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex]?.trim() || ''
    })

    rows.push(row)
  }

  return rows
}

export async function fetchCsvRows(csvPath) {
  const response = await fetch(csvPath)
  if (!response.ok) {
    throw new Error(`CSV introuvable: ${csvPath}`)
  }

  const text = await response.text()
  return parseCsv(text)
}

export async function parseCsvFile(file) {
  if (!file) {
    return []
  }

  const text = await file.text()
  return parseCsv(text)
}
