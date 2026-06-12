<template>
  <div class="page">
    <h1>Cout par item du parc</h1>

    <p v-if="erreur" class="erreur">{{ erreur }}</p>
    <p v-if="chargement">Calcul des couts en cours...</p>

    <table v-else-if="lignes.length" class="couts" border="1">
      <thead>
        <tr>
          <th>Item</th>
          <th>Type</th>
          <th>Cout GLPI</th>
          <th>Supercost</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in lignes" :key="l.type + '-' + l.items_id">
          <td>{{ l.nom }}</td>
          <td>{{ l.type }}</td>
          <td>{{ format(l.glpi) }}</td>
          <td>{{ format(l.super) }}</td>
          <td class="total">{{ format(l.total) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">Total general</td>
          <td>{{ format(totaux.glpi) }}</td>
          <td>{{ format(totaux.super) }}</td>
          <td class="total">{{ format(totaux.total) }}</td>
        </tr>
      </tfoot>
    </table>

    <p v-else class="muted">Aucun cout a afficher.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as ticket from '../../services/ticket.js'
import * as ticketCost from '../../services/ticketCost.js'
import * as itemTicket from '../../services/itemTicket.js'
import * as supercostService from '../../services/supercost.js'
import { elementParType } from '../../services/parc/index.js'

const lignes = ref([])
const chargement = ref(true)
const erreur = ref(null)

function format(n) {
  return (Math.round(n * 100) / 100).toLocaleString('fr-FR')
}

function coutGlpi(couts) {
  return (couts || []).reduce((s, c) => s + Number(c.cost_time || 0) + Number(c.cost_fixed || 0), 0)
}

const totaux = computed(() => lignes.value.reduce(
  (acc, l) => ({ glpi: acc.glpi + l.glpi, super: acc.super + l.super, total: acc.total + l.total }),
  { glpi: 0, super: 0, total: 0 }
))

onMounted(async () => {
  try {
    const [tickets, supercosts] = await Promise.all([ticket.getAll(), supercostService.getAll()])

    const mapSuper = {}
    for (const s of supercosts) mapSuper[s.ticketsId] = Number(s.supercost || 0)

    const agg = {}
    for (const t of tickets) {
      const [couts, liens] = await Promise.all([
        ticketCost.getAllForTicket(t.id).catch(() => []),
        itemTicket.getAllForTicket(t.id).catch(() => [])
      ])
      const items = liens || []
      if (!items.length) continue

      const partGlpi = coutGlpi(couts) / items.length
      const partSuper = (mapSuper[t.id] || 0) / items.length

      for (const it of items) {
        const cle = it.itemtype + '-' + it.items_id
        if (!agg[cle]) agg[cle] = { type: it.itemtype, items_id: it.items_id, glpi: 0, super: 0 }
        agg[cle].glpi += partGlpi
        agg[cle].super += partSuper
      }
    }

    const noms = {}
    for (const type of new Set(Object.values(agg).map((a) => a.type))) {
      noms[type] = {}
      try {
        const liste = await elementParType(type).getAll()
        for (const o of liste) noms[type][o.id] = o.name
      } catch (e) { /* type inconnu : on garde l'id */ }
    }

    lignes.value = Object.values(agg)
      .map((a) => ({
        type: a.type,
        items_id: a.items_id,
        nom: (noms[a.type] && noms[a.type][a.items_id]) || ('#' + a.items_id),
        glpi: a.glpi,
        super: a.super,
        total: a.glpi + a.super
      }))
      .sort((x, y) => y.total - x.total)
  } catch (e) {
    erreur.value = e.message
  } finally {
    chargement.value = false
  }
})
</script>


