// ============================================================================
// images.js
// ----------------------------------------------------------------------------
// Les images du dossier data/images sont rattachees a un materiel par leur NOM.
// Exemple : data/images/PC-LAB-002.jpeg  ->  materiel "PC-LAB-002".
//
// L'API GLPI 2.3 (haut-niveau) ne permet pas d'envoyer le fichier image lui-meme.
// On garde donc les images en local : on construit juste une "table de
// correspondance" { nom_du_materiel : adresse_de_l_image } pour pouvoir les
// afficher dans le dashboard et les fiches.
//
// import.meta.glob est une fonction de Vite qui lit tous les fichiers d'un
// dossier au moment de la compilation.
// ============================================================================

// On recupere toutes les images du dossier data/images sous forme d'URL.
const fichiers = import.meta.glob('../../data/images/*.{png,jpg,jpeg,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default'
})

// On construit la table de correspondance : { "PC-LAB-002": "/....jpeg", ... }
const imagesParNom = {}
for (const chemin in fichiers) {
  // chemin ressemble a "../../data/images/PC-LAB-002.jpeg"
  const nomFichier = chemin.split('/').pop() // "PC-LAB-002.jpeg"
  const nomSansExtension = nomFichier.replace(/\.[^.]+$/, '') // "PC-LAB-002"
  imagesParNom[nomSansExtension] = fichiers[chemin]
}

// Renvoie l'URL de l'image d'un materiel, ou null si aucune image.
export function getImageUrl(nomMateriel) {
  return imagesParNom[nomMateriel] || null
}

// Renvoie le nombre d'images disponibles (utile pour la page d'import).
export function countImages() {
  return Object.keys(imagesParNom).length
}

// Renvoie la liste des noms de fichiers (sans extension).
export function listImageNames() {
  return Object.keys(imagesParNom)
}
