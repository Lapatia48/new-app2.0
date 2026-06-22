<template>
    <div class = "page">
    <h1>Crud cout</h1>
    <p v-if="erreur" class="erreur">{{ erreur }}</p>


    <div v-for="t in tickets" :key="t.id">
    <h3>Ticket - {{ t.name }}</h3>
    <table v-if="(historiques[t.id] || []).length" border="1">

        <thead>
            <tr>
                <th>Date</th>
                <th>type</th>
                <th>Supercost</th>
                <th>frais reouverture</th>
                <th>mode</th>
                <th>Pourcentage</th>
                <th>action</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="h in historiques[t.id]" :key="h.id">
                <td>{{ h.dateOperation }}</td>
                <td>{{ h.typeOperation }}</td>
                
                <td>
                    <input v-if="enEdition === h.id && h.typeOperation === 'CLOTURE'" v-model="montant" type="number">
                    <span v-else>{{ h.typeOperation ==="CLOTURE" ? h.montant : 0}}</span>
                </td>
                <td>{{ h.typeOperation === 'REOUVERTURE' ? h.montant:0 }}</td>

                <td>
                    <select v-if="enEdition === h.id && h.typeOperation === 'REOUVERTURE'" v-model="mode">
                        <option value="1">1 - Dernier cout</option>
                        <option value="2">2 - Premier cout</option>
                        <option value="3">3 - Moyenne des couts</option>
                        <option value="4">4 - Somme des couts</option>
                    </select>
                    <span v-else>{{ h.modeUtilise }}</span>
                </td>

                <td>
                    <input v-if="enEdition === h.id && h.typeOperation ==='REOUVERTURE'" v-model="pourcentage" type="number">
                    <span v-else>{{ h.pourcentageApplique }}</span>
                </td>

                <td>
                    <button v-if="enEdition !== h.id" @click="editer(h)">Modifier</button>
                    <button v-else @click="valider(h)">Valider</button>
                </td>

            </tr>
        </tbody>

    </table>
    </div>
    </div>
</template>
<script setup>
import {ref, onMounted} from 'vue'
import * as ticket from '../../services/ticket.js'
import * as supercost from '../../services/supercost.js'

const tickets = ref([])
const historiques=ref({})
const erreur = ref(null)

const enEdition = ref(null)
const montant = ref(0)
const mode = ref(1)
const pourcentage = ref(0)

onMounted(async() => {
    try {
        tickets.value = await ticket.getAll()
        await charger()
    } catch(e){
        erreur.value = e.message
    }
})

async function charger(){
    enEdition.value=null
   for (const t of tickets.value){
        const liste = await supercost.getHistorique(t.id)
        historiques.value[t.id] = liste.filter((h) => h.typeOPeration === "CLOTURE" || h.typeOperation === "REOUVERTURE")
   }
}

async function editer(h) {
    enEdition.value = h.id
    montant.value = h.montant
    mode.value = h.modeUtilise || 1
    pourcentage.value = h.pourcentageApplique || 0
}

async function valider(h) {
    try{
        await supercost.modifierHistorique(h.id, {
            montant: Number(montant.value),
            mode: Number(mode.value),
            pourcentage: Number(pourcentage.value)
        })
        await charger()
    } catch (e) {
        erreur.value= e.message
    }
}

</script>