<template>
    <div class ="page">
        <h1>Importer kanbanisation</h1>
        <input type="file" accept=".csv" @change="choisirCsv"/>
        <button class="btn" :disabled="enCours || !texte" @click="lancerImport">
            {{ enCours ? 'Import en cours...' : "Lancer l'import" }}
        </button>
        <pre v-if="journal.length" class="journal">{{ journal.join('\n') }}</pre>
</div>
</template>

<script setup>
import { ref } from 'vue'
import { parseCsv } from '../../services/csv';
import * as ticket from '../../services/ticket.js'
import * as mouvement from '../../services/mouvement.js'

const texte=ref(null)
const enCours=ref(false)
const journal = ref([])

async function choisirCsv(evenement){
    const fichier = evenement.target.files[0]
    if(!fichier) return
    texte.value= await fichier.text()
}

function log(message){
    journal.value.push(message)
}

// Texte -> nombre. Gere la virgule decimale ("16,5" -> 16.5), comme l'import
// des couts (importData.js / nombrePositif).
function nombre(valeur){
    return Number(String(valeur).replace(',', '.'))
}

// Le CSV reference les tickets par leur REF (1, 2, 3...), pas par leur id GLPI
// (103, 104...). Les tickets ayant ete crees dans l'ordre des refs, on retrouve
// la correspondance en triant les tickets existants par id croissant :
// ref 1 -> plus petit id, ref 2 -> suivant, etc.
async function chargerRefVersId(){
    const tickets = await ticket.getAll()
    const tries = [...tickets].sort((a, b) => Number(a.id) - Number(b.id))
    const refVersId = {}
    tries.forEach((t, index) => { refVersId[String(index + 1)] = t.id })
    return refVersId
}

// On se contente de traduire le format CSV (libelle de mouvement, virgule
// decimale) puis on delegue a la MEME logique metier que le kanban
// (services/mouvement.js) : aucune duplication des couts/statuts ici.
async function appliquer(id, mvt, valeur){
    if(mvt === 'open'){
        await mouvement.reouvrir(id, nombre(valeur))
    } else if (mvt === 'cancel'){
        await mouvement.annuler(id)
    } else if (mvt === 'close'){
        await mouvement.cloturer(id, valeur === '' ? '' : nombre(valeur))
    } else {
        throw new Error('mouvement inconnu : ' + mvt)
    }
}


async function lancerImport(){
    enCours.value= true
    journal.value=[]
    try{
        const{rows} = parseCsv(texte.value)
        const refVersId = await chargerRefVersId()
        for(const row of rows){
            try{
                const id = refVersId[String(row.ticket).trim()]
                if(!id) throw new Error('ticket #' + row.ticket + ' introuvable')
                await appliquer(id, row.mvt, row.valeur)
                log('OK ticket #' + row.ticket + ' (' + id + ') ' + row.mvt + ' ' + row.valeur)
            }
            catch(e){
                log('erreur import : ' + e.message)
            }
        }
        log('Import termine.')
    }
    finally{
        enCours.value=false
    }
}

</script>
