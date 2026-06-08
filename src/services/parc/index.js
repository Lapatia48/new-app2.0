// ============================================================================
// parc/index.js — catalogue des elements du parc
// ----------------------------------------------------------------------------
// Ce fichier ne contient AUCUNE logique metier : c'est juste la liste des
// classes d'elements existantes (un import par fichier). Chaque classe reste
// totalement independante et garde SON propre payload (toInput / toDisplay).
//
// Les pages qui doivent parcourir "tous les types" (tableau de bord, liste des
// elements, reinitialisation) importent ELEMENTS depuis ici. L'import lui-meme
// (importData.js) retrouve la bonne classe a partir de la colonne Item_Type du
// CSV grace a elementParType().
//
// Pour ajouter un nouveau type de materiel : creer son fichier (ex: scanner.js)
// puis l'ajouter a la liste ELEMENTS ci-dessous. Rien d'autre a modifier.
// ============================================================================

import Computer from './computer.js'
import Monitor from './monitor.js'
import NetworkEquipment from './networkEquipment.js'
import Peripheral from './peripheral.js'
import Printer from './printer.js'
import Phone from './phone.js'
import Rack from './rack.js'
import Enclosure from './enclosure.js'
import PDU from './pdu.js'
import PassiveDCEquipment from './passiveDCEquipment.js'
import Software from './software.js'
import CartridgeItem from './cartridgeItem.js'
import ConsumableItem from './consumableItem.js'
import Cable from './cable.js'
import DeviceSimcard from './deviceSimcard.js'

// L'ordre de cette liste est l'ordre d'affichage (tableau de bord, filtres...).
export const ELEMENTS = [
  Computer,
  Monitor,
  NetworkEquipment,
  Peripheral,
  Printer,
  Phone,
  Rack,
  Enclosure,
  PDU,
  PassiveDCEquipment,
  Software,
  CartridgeItem,
  ConsumableItem,
  Cable,
  DeviceSimcard
]

// Retrouve la classe correspondant a un Item_Type du CSV ('Computer', 'Cable',
// 'DeviceSimcard'...). Leve une exception claire si le type est inconnu.
export function elementParType(itemtype) {
  const classe = ELEMENTS.find((e) => e.itemtype === itemtype)
  if (!classe) {
    throw new Error('Type d\'element du parc inconnu : "' + itemtype + '".')
  }
  return classe
}
