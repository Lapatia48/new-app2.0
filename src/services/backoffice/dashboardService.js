import { listGestionCommandes } from '@/services/dto/GestionCommandeDto'
import { buildOrderConfig } from '@/services/order/commandeAchatService'

function toAmount(value) {
  const normalized = String(value ?? '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function toDateKey(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'Sans date'
  const parts = raw.split('T')[0].split(' ')
  return parts[0] || 'Sans date'
}

function getStateKey(entry, config) {
  const stateId = Number.parseInt(String(entry?.summary?.currentStateId || ''), 10)
  const paidId = Number.parseInt(String(config?.orderStatePaidId || ''), 10)
  const deliveredId = Number.parseInt(String(config?.orderStateDeliveredId || ''), 10)

  if (Number.isFinite(stateId) && stateId === paidId) {
    return 'paid'
  }
  if (Number.isFinite(stateId) && stateId === deliveredId) {
    return 'delivered'
  }

  const label = String(entry?.summary?.currentStateLabel || '').toLowerCase()
  if (label.includes('paiement')) return 'paid'
  if (label.includes('livre')) return 'delivered'
  return 'other'
}

function getStateLabel(stateKey) {
  if (stateKey === 'paid') return 'Payée'
  if (stateKey === 'delivered') return 'Livrée'
  return 'Autre'
}

export async function fetchBackofficeDashboardStats() {
  const config = buildOrderConfig()
  const list = await listGestionCommandes()
  const orders = list
    .filter((entry) => !entry?.summary?.isCart)
    .map((entry) => {
      const stateKey = getStateKey(entry, config)
      return {
        id: Number.parseInt(String(entry?.summary?.id || ''), 10) || 0,
        orderId: Number.parseInt(String(entry?.summary?.orderId || ''), 10) || 0,
        date: toDateKey(entry?.summary?.date),
        amount: toAmount(entry?.summary?.totalPaid),
        stateKey,
        stateLabel: getStateLabel(stateKey),
        customerName: entry?.summary?.customerName || '',
        source: entry
      }
    })
    .filter((entry) => entry.stateKey === 'paid' || entry.stateKey === 'delivered')

  return {
    orders
  }
}
