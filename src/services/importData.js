// ============================================================================
// importData.js  (API v1)
// ----------------------------------------------------------------------------
// "Chef d'orchestre" de l'import. Le nom des fichiers CSV n'a aucune
// importance : seul l'ordre dans lequel ils sont deposes determine leur role,
// et leurs entetes sont verifiees en consequence (cf EXPECTED_HEADERS) :
//   1. 1er CSV  -> materiels   -> tout type de parc selon la colonne Item_Type
//                                 (Computer, Monitor, Cable, DeviceSimcard...)
//                                 + image reelle
//   2. 2e CSV   -> tickets     -> Ticket  (+ vrais liens materiels)
//   3. 3e CSV   -> couts       -> TicketCost
//
// Tout se fait dans l'ordre. En cas d'erreur (colonne inconnue, nombre negatif,
// etc.) on leve une exception ET on relance automatiquement le reset.
// ============================================================================

import { parseCsv } from './csv.js'
import { resetAll } from './reset.js'
import { elementParType } from './parc/index.js'
import * as ticket from './ticket.js'
import * as ticketCost from './ticketCost.js'
import * as itemTicket from './itemTicket.js'
import { uploadAndLink } from './document.js'
import { extraireImages } from './imagesZip.js'

// ----------------------------------------------------------------------------
// Colonnes attendues pour chaque position de depot (1er, 2e, 3e fichier).
// Le nom du fichier n'est jamais regarde : c'est l'ordre de depot puis ses
// entetes qui determinent s'il s'agit des materiels, des tickets ou des couts.
// ----------------------------------------------------------------------------
export const EXPECTED_HEADERS = {
  feuille1: ['Name', 'Status', 'Location', 'Manufacturer', 'Item_Type', 'Model', 'Inventory_Number', 'User'],
  feuille2: ['Ref_Ticket', 'Date', 'Heure', 'Type', 'Titre', 'Description', 'Status', 'Priority', 'Items'],
  feuille3: ['Num_Ticket', 'Duration_second', 'Time_Cost', 'Fixed_Cost']
}

// ----------------------------------------------------------------------------
// Tables de correspondance texte -> code GLPI.
// ----------------------------------------------------------------------------
const TYPE_TICKET = { Incident: 1, Request: 2, Demande: 2 }
const PRIORITE = {
  'Very Low': 1,
  Low: 2,
  Medium: 3,
  High: 4,
  'Very High': 5,
  Critical: 5,
  Critique: 5
}
const STATUT_TICKET = { New: 1, Nouveau: 1, Processing: 2, Assigned: 2, 'In Progress': 2, Planned: 3, Pending: 4, 'En attente': 4, Resolved: 5 ,'Résolu': 5, Solved: 5, Closed: 6 , 'Fermé':6}

// ----------------------------------------------------------------------------
// Petites fonctions de verification (validations).
// ----------------------------------------------------------------------------
function verifierColonnes(headers, attendues, nomFeuille) {
  if (headers.join(',') !== attendues.join(',')) {
    throw new Error(
      'Colonnes incorrectes dans ' + nomFeuille + '.\n' +
      'Attendu : ' + attendues.join(',') + '\n' +
      'Recu    : ' + headers.join(',')
    )
  }
}

// Texte -> nombre positif. Gere la virgule decimale ("8,7" -> 8.7).
function nombrePositif(valeur, champ) {
  const nombre = Number(String(valeur).replace(',', '.'))
  if (Number.isNaN(nombre)) {
    throw new Error('La valeur "' + valeur + '" du champ ' + champ + ' n\'est pas un nombre.')
  }
  if (nombre < 0) {
    throw new Error('Le champ ' + champ + ' ne peut pas etre negatif (recu : ' + valeur + ').')
  }
  return nombre
}

// "JJ/MM/AAAA" + "HH:MM" -> "AAAA-MM-JJ HH:MM:00" (format GLPI).
function dateGlpi(dateFr, heure) {
  if (!dateFr) return null
  const [jour, mois, annee] = dateFr.split('/')
  return annee + '-' + mois + '-' + jour + ' ' + (heure || '00:00') + ':00'
}

// Cherche un code dans une table, sinon leve une exception.
function correspondance(table, valeur, champ) {
  const code = table[valeur]
  if (code === undefined) {
    throw new Error('Valeur inconnue "' + valeur + '" pour le champ ' + champ + '.')
  }
  return code
}

// ----------------------------------------------------------------------------
// Etape 1 : import des materiels (feuille1).
// "images" est une table { nomMateriel : fichierImage } construite par la page.
// Renvoie une table { nomMateriel : { itemtype, id } } pour relier les tickets.
// ----------------------------------------------------------------------------
async function importerMateriels(rows, images, log) {
  const mapMateriels = {}

  for (const row of rows) {
    // On choisit la BONNE classe selon la colonne Item_Type ('Computer',
    // 'Cable', 'DeviceSimcard'...). Chaque classe connait SON propre payload :
    // plus de construction generique, donc plus d'erreur 400 sur les types
    // particuliers (cable, carte SIM...).
    const Element = elementParType(row.Item_Type)

    // Le constructeur range la ligne CSV dans un objet, puis create() envoie le
    // payload exact a GLPI et renvoie l'id cree.
    const materiel = new Element(row)
    const id = await materiel.create()

    mapMateriels[row.Name] = { itemtype: Element.itemtype, id }
    log('  + Materiel importe : ' + row.Name + ' (' + Element.itemtype + ')')

    // Image reelle : si une image porte le meme nom, on l'envoie a GLPI.
    const image = images[row.Name]
    if (image) {
      await uploadAndLink(image, row.Name, Element.itemtype, id)
      log('     image envoyee : ' + image.name)
    }
  }

  return mapMateriels
}

// ----------------------------------------------------------------------------
// Etape 2 : import des tickets (feuille2) + vrais liens vers les materiels.
// Renvoie une table { Ref_Ticket : id_du_ticket }.
// STRATEGIE : creer les tickets en "New", puis rattacher les materiels, puis
// les passer a leur statut final. Cela evite les blocages GLPI sur les liens
// Item_Ticket pour les tickets fermes (qui refusent souvent les modifications).
// ----------------------------------------------------------------------------
async function importerTickets(rows, mapMateriels, log) {
  const refVersId = {}

  for (const row of rows) {
    const priorite = correspondance(PRIORITE, row.Priority, 'Priority')
    const statutFinal = correspondance(STATUT_TICKET, row.Status, 'Status')

    // Phase 1 : creer le ticket en "New" (status = 1)
    const input = {
      name: row.Titre,
      content: row.Description || '',
      type: correspondance(TYPE_TICKET, row.Type, 'Type'),
      status: 1, // "New" : on passera au statut final apres les rattachements
      urgency: priorite,
      impact: priorite,
      priority: priorite,
      date: dateGlpi(row.Date, row.Heure)
    }

    const cree = await ticket.create(input)
    refVersId[row.Ref_Ticket] = cree.id
    log('  + Ticket importe : #' + row.Ref_Ticket + ' ' + row.Titre)

    // Phase 2 : rattacher les materiels PENDANT que le ticket est en "New"
    if (row.Items) {
      let noms = []
      try {
        noms = JSON.parse(row.Items) // ex : ["PC-ADM-001","MN-FORM-002"]
      } catch (e) {
        noms = []
      }
      for (const nom of noms) {
        const materiel = mapMateriels[nom]
        if (materiel) {
          await itemTicket.create(cree.id, materiel.itemtype, materiel.id)
          log('     materiel rattache : ' + nom)
        } else {
          log('     ATTENTION : materiel "' + nom + '" introuvable, lien ignore.')
        }
      }
    }

    // Phase 3 : passer le ticket a son statut final (ne change que si different de "New")
    if (statutFinal !== 1) {
      await ticket.update(cree.id, { status: statutFinal })
      log('     statut mis a jour')
    }
  }

  return refVersId
}

// ----------------------------------------------------------------------------
// Etape 3 : import des couts (feuille3).
// ----------------------------------------------------------------------------
async function importerCouts(rows, refVersId, log) {
  for (const row of rows) {
    const ticketId = refVersId[row.Num_Ticket]
    if (!ticketId) {
      throw new Error('Le cout fait reference au ticket #' + row.Num_Ticket + ' qui n\'existe pas.')
    }

    const champs = {
      name: 'Cout ticket #' + row.Num_Ticket,
      actiontime: nombrePositif(row.Duration_second, 'Duration_second'),
      cost_time: nombrePositif(row.Time_Cost, 'Time_Cost'),
      cost_fixed: nombrePositif(row.Fixed_Cost, 'Fixed_Cost')
    }

    await ticketCost.create(ticketId, champs)
    log('  + Cout importe pour le ticket #' + row.Num_Ticket)
  }
}

// ----------------------------------------------------------------------------
// Fonction principale appelee par la page d'import.
//   texte1/2/3 : contenu des 3 CSV
//   zipImages  : archive .zip des images des materiels (File, optionnelle)
// ----------------------------------------------------------------------------
export async function runImport({ texte1, texte2, texte3, zipImages = null }, log = () => {}) {
  try {
    // --- 1. Lecture + verification des colonnes ---
    const feuille1 = parseCsv(texte1)
    const feuille2 = parseCsv(texte2)
    const feuille3 = parseCsv(texte3)

    verifierColonnes(feuille1.headers, EXPECTED_HEADERS.feuille1, '1er fichier (materiels attendus)')
    verifierColonnes(feuille2.headers, EXPECTED_HEADERS.feuille2, '2e fichier (tickets attendus)')
    verifierColonnes(feuille3.headers, EXPECTED_HEADERS.feuille3, '3e fichier (couts attendus)')

    // --- 2. Import dans l'ordre ---
    log('Lecture de l\'archive d\'images...')
    const images = await extraireImages(zipImages, log)

    log('Import des materiels...')
    const mapMateriels = await importerMateriels(feuille1.rows, images, log)

    log('Import des tickets...')
    const refVersId = await importerTickets(feuille2.rows, mapMateriels, log)

    log('Import des couts...')
    await importerCouts(feuille3.rows, refVersId, log)

    log('Import termine avec succes !')
    return {
      materiels: feuille1.rows.length,
      tickets: feuille2.rows.length,
      couts: feuille3.rows.length
    }
  } catch (erreur) {
    // En cas de probleme : on nettoie tout pour repartir d'une base propre.
    log('ERREUR : ' + erreur.message)
    log('Annulation : relance automatique du reset des donnees...')
    await resetAll(log)
    throw erreur
  }
}