import { getDataBaseUrl } from './tokenStore'

const DATA_BASE_URL = getDataBaseUrl()

const computerFields = {
  Name: 'name',
  Status: 'status',
  Location: 'location',
  Manufacturer: 'manufacturer',
  Item_Type: 'item_type',
  Model: 'model',
  Inventory_Number: 'inventory_number',
  User: 'user'
}

const ticketFields = {
  Ref_Ticket: 'ref_ticket',
  Date: 'date',
  Heure: 'time',
  Type: 'type',
  Titre: 'title',
  Description: 'content',
  Status: 'status',
  Priority: 'priority',
  Items: 'items'
}

const ticketCostFields = {
  Num_Ticket: 'ticket_ref',
  Duration_second: 'duration_seconds',
  Time_Cost: 'time_cost',
  Fixed_Cost: 'fixed_cost'
}

function mapFields(row, mapping) {
  const payload = {}
  Object.entries(mapping).forEach(([sourceKey, targetKey]) => {
    const value = row[sourceKey]
    if (value !== undefined && value !== '') {
      payload[targetKey] = value
    }
  })
  return payload
}

function parseItemsList(value) {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

export const csvEntities = [
  {
    key: 'computers',
    label: 'Computers',
    endpoint: '/Computer',
    csvFileName: 'feuille1.csv',
    csvPath: `${DATA_BASE_URL}/feuille1.csv`,
    mapRowToPayload(row) {
      return mapFields(row, computerFields)
    },
    deleteMatch: [
      { payloadKey: 'inventory_number', itemKey: 'inventory_number' },
      { payloadKey: 'name', itemKey: 'name' }
    ],
    image: {
      column: 'Image',
      basePath: `${DATA_BASE_URL}/images`,
      endpoint: '/Document'
    }
  },
  {
    key: 'tickets',
    label: 'Tickets',
    endpoint: '/Ticket',
    csvFileName: 'feuille2.csv',
    csvPath: `${DATA_BASE_URL}/feuille2.csv`,
    mapRowToPayload(row) {
      const payload = mapFields(row, ticketFields)
      if (payload.items) {
        payload.items = parseItemsList(payload.items)
      }
      return payload
    },
    deleteMatch: [
      { payloadKey: 'ref_ticket', itemKey: 'id' },
      { payloadKey: 'title', itemKey: 'name' }
    ]
  },
  {
    key: 'ticket-costs',
    label: 'Ticket costs',
    endpoint: '/TicketCost',
    csvFileName: 'feuille3.csv',
    csvPath: `${DATA_BASE_URL}/feuille3.csv`,
    mapRowToPayload(row) {
      return mapFields(row, ticketCostFields)
    },
    deleteMatch: [
      { payloadKey: 'ticket_ref', itemKey: 'ticket_ref' }
    ]
  }
]
