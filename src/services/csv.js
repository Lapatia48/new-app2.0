// ============================================================================
// csv.js
// ----------------------------------------------------------------------------
// Un parser CSV simple mais qui gere les cas importants de nos fichiers :
//   - les valeurs entre guillemets   ex : "[""PC-ADM-001""]"
//   - les virgules a l'interieur d'une valeur entre guillemets
//   - les nombres a virgule          ex : "8,7"
//
// parseCsv(texte) renvoie :
//   {
//     headers: ["Name", "Status", ...],   // la 1ere ligne
//     rows:    [ { Name: "...", Status: "..." }, ... ]  // une ligne = un objet
//   }
// ============================================================================

// Decoupe UNE ligne CSV en tableau de valeurs, en respectant les guillemets.
function splitLine(line) {
  const values = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Deux guillemets a la suite = un vrai guillemet dans la valeur.
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // on saute le 2eme guillemet
      } else {
        insideQuotes = !insideQuotes // on entre / sort d'une zone entre guillemets
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  values.push(current) // derniere valeur de la ligne
  return values
}

export function parseCsv(texte) {
  // On enleve un eventuel BOM (caractere invisible au debut des fichiers Excel).
  texte = texte.replace(/^﻿/, '')

  // On coupe en lignes et on retire les lignes vides.
  const lines = texte
    .split(/\r?\n/)
    .filter((ligne) => ligne.trim() !== '')

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = splitLine(lines[0]).map((h) => h.trim())

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      // .trim() pour enlever les espaces, et "" si la colonne est absente.
      row[header] = (values[index] ?? '').trim()
    })
    rows.push(row)
  }

  return { headers, rows }
}
