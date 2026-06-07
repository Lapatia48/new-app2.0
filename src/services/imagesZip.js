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
//
// IMPORTANT (upload reel vers GLPI) :
// GLPI refuse un fichier image dont le CONTENU ne correspond pas a son
// extension (ex : un vrai JPEG renomme en ".png"). Dans ce cas il cree bien
// le Document mais SANS le fichier (filename/filepath/mime a null), ce qui
// donnait des images "vides". On detecte donc le vrai type via les premiers
// octets (magic bytes) et on REECRIT l'extension + le type MIME du fichier
// pour qu'ils collent au contenu : GLPI accepte alors l'upload reel.
// ============================================================================

import JSZip from 'jszip'

const EXTENSION_IMAGE = /\.(png|jpe?g|gif|webp)$/i

// Detecte le vrai type d'une image a partir de ses premiers octets.
// Renvoie { ext, mime } ou null si le format n'est pas reconnu.
async function detecterTypeImage(blob) {
  const octets = new Uint8Array(await blob.slice(0, 12).arrayBuffer())

  // PNG : 89 50 4E 47
  if (octets[0] === 0x89 && octets[1] === 0x50 && octets[2] === 0x4e && octets[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' }
  }
  // JPEG : FF D8 FF
  if (octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  // GIF : 47 49 46 38  ("GIF8")
  if (octets[0] === 0x47 && octets[1] === 0x49 && octets[2] === 0x46 && octets[3] === 0x38) {
    return { ext: 'gif', mime: 'image/gif' }
  }
  // WEBP : "RIFF" .... "WEBP"
  if (
    octets[0] === 0x52 && octets[1] === 0x49 && octets[2] === 0x46 && octets[3] === 0x46 &&
    octets[8] === 0x57 && octets[9] === 0x45 && octets[10] === 0x42 && octets[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' }
  }
  return null
}

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

    // On aligne l'extension et le type MIME sur le contenu reel du fichier.
    // Si le format n'est pas reconnu, on garde le fichier tel quel.
    const type = await detecterTypeImage(contenu)
    if (type) {
      const nomCorrige = nom + '.' + type.ext
      if (nomCorrige !== nomFichier) {
        log('  Image "' + nomFichier + '" : contenu reel = ' + type.ext + ', renommee en "' + nomCorrige + '"')
      }
      images[nom] = new File([contenu], nomCorrige, { type: type.mime })
    } else {
      images[nom] = new File([contenu], nomFichier, { type: contenu.type })
    }
  }

  log('  Images trouvees dans l\'archive : ' + Object.keys(images).length)
  return images
}
