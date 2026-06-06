// ============================================================================
// importData.js
// ----------------------------------------------------------------------------
// C'est le "chef d'orchestre" de l'import. Il :
//   1. verifie que les colonnes des CSV sont bien celles attendues
//   2. importe les materiels (feuille1)   -> Computer / Monitor
//   3. importe les tickets (feuille2)      -> Ticket
//   4. importe les couts (feuille3)        -> TicketCost
//
// Tout se fait dans l'ordre (sequentiel). Si une erreur arrive (colonne
// inconnue, nombre negatif, etc.) on releve une exception ET on relance
// automatiquement le reset pour ne pas laisser des donnees a moitie importees.
// ============================================================================

import { parseCsv } from './csv.js'
import { resolveDropdown } from './dropdowns.js'
import { resetAll } from './reset.js'
import * as computer from './computer.js'
import * as monitor from './monitor.js'
import * as ticket from './ticket.js'
import * as ticketCost from './ticketCost.js'

// ----------------------------------------------------------------------------
// Colonnes attendues dans chaque fichier (le "modele").
// Si le CSV importe a des colonnes differentes, on leve une exception.
// ----------------------------------------------------------------------------
export const EXPECTED_HEADERS = {
  feuille1: ['Name', 'Status', 'Location', 'Manufacturer', 'Item_Type', 'Model', 'Inventory_Number', 'User'],
  feuille2: ['Ref_Ticket', 'Date', 'Heure', 'Type', 'Titre', 'Description', 'Status', 'Priority', 'Items'],
  feuille3: ['Num_Ticket', 'Duration_second', 'Time_Cost', 'Fixed_Cost']
}

// ----------------------------------------------------------------------------
// Tables de correspondance texte -> code GLPI.
// ----------------------------------------------------------------------------
// Type de ticket : 1 = Incident, 2 = Demande.
const TYPE_TICKET = { Incident: 1, Request: 2, Demande: 2 }

// Priorite : 1 (tres basse) ... 5 (tres haute).
const PRIORITE = { 'Very Low': 1, Low: 2, Medium: 3, High: 4, 'Very High': 5 }

// ----------------------------------------------------------------------------
// Petites fonctions de verification (validations).
// ----------------------------------------------------------------------------

// Verifie que les colonnes du CSV sont exactement celles attendues.
function verifierColonnes(headers, attendues, nomFeuille) {
  const recu = headers.join(',')
  const modele = attendues.join(',')
  if (recu !== modele) {
    throw new Error(
      'Colonnes incorrectes dans ' + nomFeuille + '.\n' +
      'Attendu : ' + modele + '\n' +
      'Recu    : ' + recu
    )
  }
}

// Transforme un texte en nombre positif. Gere la virgule decimale ("8,7" -> 8.7).
// Leve une exception si ce n'est pas un nombre ou s'il est negatif.
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

// Transforme une date "JJ/MM/AAAA" + une heure "HH:MM" en format GLPI
// "AAAA-MM-JJ HH:MM:00".
function dateGlpi(dateFr, heure) {
  if (!dateFr) return null
  const [jour, mois, annee] = dateFr.split('/')
  const heurePropre = heure || '00:00'
  return annee + '-' + mois + '-' + jour + ' ' + heurePropre + ':00'
}

// Cherche un code dans une table de correspondance, sinon leve une exception.
function correspondance(table, valeur, champ) {
  const code = table[valeur]
  if (code === undefined) {
    throw new Error('Valeur inconnue "' + valeur + '" pour le champ ' + champ + '.')
  }
  return code
}

// ----------------------------------------------------------------------------
// Etape 1 : import des materiels (feuille1).
// Renvoie une table { nomMateriel : { type, id } } pour relier les tickets.
// ----------------------------------------------------------------------------
async function importerMateriels(rows, log) {
  for (const row of rows) {
    // Le champ "User" du CSV est un nom de personne : on le garde dans le
    // champ texte "contact" (pas besoin de creer un compte utilisateur GLPI).
    const body = {
      name: row.Name,
      otherserial: row.Inventory_Number, // numero d'inventaire
      contact: row.User
    }

    // Champs "dropdown" : on resout (ou cree) l'id correspondant au texte.
    if (row.Status) body.status = { id: await resolveDropdown('State', row.Status) }
    if (row.Location) body.location = { id: await resolveDropdown('Location', row.Location) }
    if (row.Manufacturer) body.manufacturer = { id: await resolveDropdown('Manufacturer', row.Manufacturer) }

    // Selon le type, on n'utilise pas le meme service ni le meme "modele".
    if (row.Item_Type === 'Computer') {
      if (row.Model) body.model = { id: await resolveDropdown('ComputerModel', row.Model) }
      await computer.create(body)
    } else if (row.Item_Type === 'Monitor') {
      if (row.Model) body.model = { id: await resolveDropdown('MonitorModel', row.Model) }
      await monitor.create(body)
    } else {
      throw new Error('Item_Type inconnu "' + row.Item_Type + '" pour le materiel ' + row.Name + '.')
    }

    log('  + Materiel importe : ' + row.Name + ' (' + row.Item_Type + ')')
  }
}

// ----------------------------------------------------------------------------
// Etape 2 : import des tickets (feuille2).
// Renvoie une table { Ref_Ticket : id_du_ticket_cree } pour relier les couts.
// ----------------------------------------------------------------------------
async function importerTickets(rows, log) {
  const refVersId = {}

  for (const row of rows) {
    // La colonne "Items" contient une liste JSON, ex : ["PC-ADM-001"].
    // L'API haut-niveau ne permet pas de lier le materiel au ticket, donc on
    // ajoute simplement l'info dans la description.
    let materiels = ''
    if (row.Items) {
      try {
        const liste = JSON.parse(row.Items)
        materiels = '\n\nMateriel concerne : ' + liste.join(', ')
      } catch (e) {
        materiels = '\n\nMateriel concerne : ' + row.Items
      }
    }

    // Remarque : dans l'API GLPI 2.3, le "status" d'un ticket est en lecture
    // seule a la creation (GLPI met automatiquement le statut "Nouveau").
    // On ne l'envoie donc pas. La colonne Status du CSV reste informative.
    const body = {
      name: row.Titre,
      content: (row.Description || '') + materiels,
      type: correspondance(TYPE_TICKET, row.Type, 'Type'),
      priority: correspondance(PRIORITE, row.Priority, 'Priority'),
      date: dateGlpi(row.Date, row.Heure),
      external_id: String(row.Ref_Ticket) // sert a retrouver le ticket pour ses couts
    }

    const cree = await ticket.create(body)
    refVersId[row.Ref_Ticket] = cree.id
    log('  + Ticket importe : #' + row.Ref_Ticket + ' ' + row.Titre)
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

    const body = {
      name: 'Cout ticket #' + row.Num_Ticket,
      duration: nombrePositif(row.Duration_second, 'Duration_second'),
      cost_time: nombrePositif(row.Time_Cost, 'Time_Cost'),
      cost_fixed: nombrePositif(row.Fixed_Cost, 'Fixed_Cost')
    }

    await ticketCost.create(ticketId, body)
    log('  + Cout importe pour le ticket #' + row.Num_Ticket)
  }
}

// ----------------------------------------------------------------------------
// Fonction principale appelee par la page d'import.
// Elle recoit le CONTENU (texte) des 3 fichiers CSV.
// ----------------------------------------------------------------------------
export async function runImport({ texte1, texte2, texte3 }, log = () => {}) {
  try {
    // --- 1. Lecture + verification des colonnes ---
    const feuille1 = parseCsv(texte1)
    const feuille2 = parseCsv(texte2)
    const feuille3 = parseCsv(texte3)

    verifierColonnes(feuille1.headers, EXPECTED_HEADERS.feuille1, 'feuille1 (materiels)')
    verifierColonnes(feuille2.headers, EXPECTED_HEADERS.feuille2, 'feuille2 (tickets)')
    verifierColonnes(feuille3.headers, EXPECTED_HEADERS.feuille3, 'feuille3 (couts)')

    // --- 2. Import dans l'ordre ---
    log('Import des materiels...')
    await importerMateriels(feuille1.rows, log)

    log('Import des tickets...')
    const refVersId = await importerTickets(feuille2.rows, log)

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
