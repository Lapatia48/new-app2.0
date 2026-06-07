// ============================================================================
// imagesZip.js
// ----------------------------------------------------------------------------
// Le champ "images" de la page d'import accepte desormais une archive .zip
// (et non plus un dossier). Cette archive est dezippee PENDANT l'import :
// on y cherche uniquement les fichiers dont l'extension est une image
// (png/jpg/jpeg/gif/webp), ou qu'ils soient dans le zip (a la racine ou
// dans des sous-dossiers), et on ignore tout le reste (autres fichiers,
// dossiers...).
//
// Le nom du materiel = nom du fichier image sans son extension, exactement
// comme avant (ex : "PC-LAB-002.jpeg" -> materiel "PC-LAB-002").
// ============================================================================

import JSZip from 'jszip'

const EXTENSION_IMAGE = /\.(png|jpe?g|gif|webp)$/i

// Dezippe l'archive et renvoie la table { nomMateriel : fichierImage }
// attendue par runImport / uploadAndLink. Renvoie une table vide si aucune
// archive n'a ete fournie.
export async function extraireImages(fichierZip, log = () => {}) {
  const images = {}
  if (!fichierZip) return images

  const archive = await JSZip.loadAsync(fichierZip)

  for (const entree of Object.values(archive.files)) {
    if (entree.dir) continue

    // entree.name peut contenir un chemin ("photos/PC-LAB-002.jpeg") :
    // seul le nom du fichier final nous interesse.
    const nomFichier = entree.name.split('/').pop()
    if (!EXTENSION_IMAGE.test(nomFichier)) continue

    const contenu = await entree.async('blob')
    const nom = nomFichier.replace(/\.[^.]+$/, '')
    images[nom] = new File([contenu], nomFichier, { type: contenu.type })
  }

  log('  Images trouvees dans l\'archive : ' + Object.keys(images).length)
  return images
}
