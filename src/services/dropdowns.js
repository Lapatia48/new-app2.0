// ============================================================================
// dropdowns.js
// ----------------------------------------------------------------------------
// Dans GLPI, des champs comme Location, Manufacturer, Status (State), Model...
// ne sont pas du texte libre : ce sont des "dropdowns" (listes deroulantes).
// Quand on cree un ordinateur, on doit donner l'identifiant (id) de la valeur,
// pas son texte.
//
// resolveDropdown("Location", "Administration") va donc :
//   1. chercher si "Administration" existe deja  -> renvoie son id
//   2. sinon la creer                            -> renvoie le nouvel id
//
// On garde un petit cache pour ne pas refaire le meme appel plusieurs fois.
// ============================================================================

import { get, post } from './api.js'

// cache["Location|Administration"] = 5
const cache = {}

export async function resolveDropdown(itemtype, name) {
  // Pas de valeur dans le CSV -> rien a lier.
  if (!name) {
    return null
  }

  const cleFiche = itemtype + '|' + name
  if (cache[cleFiche] !== undefined) {
    return cache[cleFiche]
  }

  const chemin = '/Dropdowns/' + itemtype

  // 1. On cherche la valeur par son nom.
  //    Le filtre GLPI utilise la syntaxe RSQL : name=="texte".
  const filtre = encodeURIComponent('name=="' + name + '"')
  const trouves = await get(chemin + '?filter=' + filtre)

  if (Array.isArray(trouves) && trouves.length > 0) {
    cache[cleFiche] = trouves[0].id
    return trouves[0].id
  }

  // 2. Pas trouvee -> on la cree.
  const cree = await post(chemin, { name })
  cache[cleFiche] = cree.id
  return cree.id
}

// On vide le cache apres un reset, car les ids ont change.
export function clearDropdownCache() {
  for (const cle of Object.keys(cache)) {
    delete cache[cle]
  }
}
