<template>
  <div class="page">
    <h1>Cout par item du parc</h1>

    <p v-if="erreur" class="erreur">{{ erreur }}</p>
    <p v-if="chargement">Calcul des couts en cours...</p>

    <table v-else-if="lignes.length" class="couts" border="1">
      <thead>
        <tr>
          <th>Type</th>
          <th>Cout GLPI</th>
          <th>Supercost</th>
          <th>Frais de reouverture</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>

        <template v-for="g in parType" :key="g.type">
          <tr class="type" @click="typeOuvert = typeOuvert === g.type ? null : g.type">
            <td>{{ typeOuvert === g.type ? '[-]' : '[+]'}} {{ g.type }}</td>
            <td>{{ format(g.glpi) }}</td>
            <td>{{ format(g.super) }}</td>
            <td>{{ format(g.fraisReouverture) }}</td>
            <td class="total">{{ format(g.total) }}</td>
          </tr>

          <tr v-for="l in itemsDe(g.type)" v-show="typeOuvert === g.type" :key="g.type + '-' + l.items_id" >
            <td>{{ l.nom }}</td>
            <td>{{ format(l.glpi) }}</td>
            <td>{{ format(l.super) }}</td>
            <td>{{ format(l.fraisReouverture) }}</td>
            <td class="total">{{ format(l.total) }}</td>
          </tr>

        </template>
      </tbody>
      <tfoot>
        <tr>
          <td >Total general</td>
          <td>{{ format(totaux.glpi) }}</td>
          <td>{{ format(totaux.super) }}</td>
          <td>{{ format(totaux.fraisReouverture) }}</td>
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
const typeOuvert=ref(null)

function format(n) {
  return (Math.round(n * 100) / 100).toLocaleString('fr-FR')
}

function itemsDe(type){
  return lignes.value.filter((l) => l.type === type)
}

const parType = computed(() => {
  const groupes ={}
  for(const l of lignes.value){
    if(!groupes[l.type]) {
      groupes[l.type] = { type:l.type, glpi: 0, super: 0, fraisReouverture: 0, total:0 }
    }

    groupes[l.type].glpi += l.glpi
    groupes[l.type].super += l.super
    groupes[l.type].fraisReouverture += l.fraisReouverture
    groupes[l.type].total += l.total
  }
  return Object.values(groupes).sort((a,b) => b.total - a.total)

})

// GLPI : cost_time est un cout HORAIRE. Il faut donc convertir la duree
// (actiontime, en secondes) en heures avant de multiplier, puis ajouter
// les couts fixe et materiel. Total = cost_time * (actiontime/3600) + cost_fixed + cost_material.
function coutGlpi(couts) {
  return (couts || []).reduce((s, c) => {
    const heures = Number(c.actiontime || 0) / 3600
    return s + Number(c.cost_time || 0) * heures + Number(c.cost_fixed || 0) + Number(c.cost_material || 0)
  }, 0)
}

const totaux = computed(() => lignes.value.reduce(
  (acc, l) => ({
    glpi: acc.glpi + l.glpi,
    super: acc.super + l.super,
    fraisReouverture: acc.fraisReouverture + l.fraisReouverture,
    total: acc.total + l.total
  }),
  { glpi: 0, super: 0, fraisReouverture: 0, total: 0 }
))

onMounted(async () => {
  try {
    const [tickets, supercosts] = await Promise.all([ticket.getAll(), supercostService.getAll()])

    const mapSuper = {}
    const mapFrais = {}
    for (const s of supercosts) {
      mapSuper[s.ticketsId] = Number(s.supercost || 0)
      mapFrais[s.ticketsId] = Number(s.fraisReouverture || 0)
    }

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
      const partFrais = (mapFrais[t.id] || 0) / items.length

      for (const it of items) {
        const cle = it.itemtype + '-' + it.items_id
        if (!agg[cle]) agg[cle] = { type: it.itemtype, items_id: it.items_id, glpi: 0, super: 0, fraisReouverture: 0 }
        agg[cle].glpi += partGlpi
        agg[cle].super += partSuper
        agg[cle].fraisReouverture += partFrais
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
        fraisReouverture: a.fraisReouverture,
        total: a.glpi + a.super + a.fraisReouverture
      }))
      .sort((x, y) => y.total - x.total)
  } catch (e) {
    erreur.value = e.message
  } finally {
    chargement.value = false
  }
})
</script>


