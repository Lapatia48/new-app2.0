import { listGestionCommandes } from '@/services/dto/GestionCommandeDto'

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

function isFailedOrder(entry) {
  const label = String(entry?.summary?.currentStateLabel || '').toLowerCase()
  return label.includes('echec') || label.includes('erreur') || label.includes('annul')
}

export async function fetchBackofficeDashboardStats() {
  const list = await listGestionCommandes()
  const orders = list.filter((entry) => !entry?.summary?.isCart && !isFailedOrder(entry))

  const map = new Map()
  let totalCount = 0
  let totalAmount = 0

  orders.forEach((entry) => {
    const dateKey = toDateKey(entry?.summary?.date)
    const amount = toAmount(entry?.summary?.totalPaid)
    const current = map.get(dateKey) || { date: dateKey, count: 0, amount: 0 }
    current.count += 1
    current.amount += amount
    map.set(dateKey, current)
    totalCount += 1
    totalAmount += amount
  })

  const days = Array.from(map.values()).sort((a, b) => {
    if (a.date === 'Sans date') return 1
    if (b.date === 'Sans date') return -1
    return a.date < b.date ? 1 : -1
  })

  return {
    days,
    totalCount,
    totalAmount
  }
}
