// ============================================================================
// document.js  (API v1)
// ----------------------------------------------------------------------------
// Upload REEL d'un fichier image vers GLPI, puis rattachement a un materiel.
//
// En GLPI v1, l'upload d'un fichier se fait en "multipart/form-data" avec :
//   - un champ "uploadManifest" = JSON { input: { name, _filename: ["xxx"] } }
//   - le fichier dans "filename[0]"
//
// Le lien document <-> materiel est l'itemtype "Document_Item"
// (table glpi_documents_items) : documents_id, itemtype, items_id.
// ============================================================================

import { post, postMultipart } from './api.js'

// 1. Envoie le fichier dans GLPI et renvoie l'id du Document cree.
export async function upload(file, name) {
  const formData = new FormData()

  // Le manifeste decrit le document et liste les fichiers envoyes.
  const manifest = JSON.stringify({
    input: {
      name: name || file.name,
      _filename: [file.name]
    }
  })

  formData.append('uploadManifest', manifest)
  formData.append('filename[0]', file, file.name)

  const resultat = await postMultipart('/Document', formData)
  return resultat.id
}

// 2. Rattache un document a un materiel (Computer / Monitor).
export function link(documentId, itemtype, itemsId) {
  return post('/Document_Item', {
    documents_id: documentId,
    itemtype,
    items_id: itemsId
  })
}

// Pratique : upload + rattachement en une seule fonction.
export async function uploadAndLink(file, name, itemtype, itemsId) {
  const documentId = await upload(file, name)
  await link(documentId, itemtype, itemsId)
  return documentId
}
