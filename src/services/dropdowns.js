// ============================================================================
// dropdowns.js  (API v1)
// ----------------------------------------------------------------------------
// Dans GLPI, des champs comme Location, Manufacturer, State (statut), Model...
// sont des "dropdowns" : on doit fournir leur identifiant (id), pas leur texte.
//
// resolveDropdown("Location", "Administration") va donc :
//   1. chercher si "Administration" existe deja  -> renvoie son id
//   2. sinon la creer                            -> renvoie le nouvel id
//
// Un petit cache evite de refaire le meme appel plusieurs fois.
// ============================================================================

import { get, post } from './api.js'

// cache["Location|Administration"] = 5
const cache = {}

export async function resolveDropdown(itemtype, name) {
  if (!name) {
    return 0 // 0 = "aucun" dans GLPI
  }

  const cle = itemtype + '|' + name
  if (cache[cle] !== undefined) {
    return cache[cle]
  }

  // 1. On cherche par le nom (searchText fait une recherche "contient").
  const resultats = await get('/' + itemtype + '?searchText[name]=' + encodeURIComponent(name) + '&range=0-99')

  // On garde uniquement la correspondance EXACTE sur le nom.
  const exact = Array.isArray(resultats)
    ? resultats.find((r) => r.name === name)
    : null

  if (exact) {
    cache[cle] = exact.id
    return exact.id
  }

  // 2. Pas trouvee -> on la cree.
  const cree = await post('/' + itemtype, { name })
  cache[cle] = cree.id
  return cree.id
}

// On vide le cache apres un reset, car les ids ont change.
export function clearDropdownCache() {
  for (const c of Object.keys(cache)) {
    delete cache[c]
  }
}
