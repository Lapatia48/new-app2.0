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

import { get, post, postMultipart, getBlob } from './api.js'

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

// ----------------------------------------------------------------------------
// Lecture : recuperer les documents rattaches a un materiel.
// ----------------------------------------------------------------------------

// 3. Liste les id des documents lies a un materiel (Computer/53, Monitor/2 ...).
//    GLPI expose la sous-ressource "/{itemtype}/{id}/Document_Item/".
export async function getItemDocumentIds(itemtype, itemsId) {
  const liens = await get('/' + itemtype + '/' + itemsId + '/Document_Item/')
  if (!Array.isArray(liens)) return []
  return liens.map((lien) => lien.documents_id).filter(Boolean)
}

// 4. Telecharge le fichier d'un document et renvoie une URL affichable
//    (objet blob, utilisable directement dans <img src="...">).
export async function getDocumentImageUrl(documentId) {
  const blob = await getBlob('/Document/' + documentId)
  return URL.createObjectURL(blob)
}

// 5. Pratique : URL de la premiere image rattachee a un materiel, ou null.
export async function getItemImageUrl(itemtype, itemsId) {
  const ids = await getItemDocumentIds(itemtype, itemsId)
  if (ids.length === 0) return null
  return getDocumentImageUrl(ids[0])
}
