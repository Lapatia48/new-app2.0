// ============================================================================
// champs.js  (helper commun aux elements du parc)
// ----------------------------------------------------------------------------
// Seule fonction VRAIMENT generique gardee en commun : le "nettoyage" des
// valeurs renvoyees par GLPI pour l'affichage. Le reste (le payload exact de
// chaque element) reste ecrit a la main dans chaque service, car un Computer,
// une Cable et une carte SIM n'ont PAS les memes champs.
//
// Avec "expand_dropdowns=true", GLPI renvoie le NOM des dropdowns au lieu de
// leur id. Mais un champ vide revient sous la forme "&nbsp;" (ou 0), ce qui
// est moche a afficher. nettoyer() transforme ces cas en chaine vide.
// ============================================================================

export function nettoyer(valeur) {
  if (valeur === null || valeur === undefined) return ''
  if (valeur === '&nbsp;' || valeur === '0' || valeur === 0) return ''
  return String(valeur)
}
