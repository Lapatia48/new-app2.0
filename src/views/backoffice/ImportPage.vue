<template>
  <div class="page">
    <h1>Importer les donnees</h1>
    <p class="info">
      Choisissez les 3 fichiers CSV et l'archive .zip des images depuis votre
      ordinateur, puis cliquez sur "Lancer l'import". Le nom des fichiers
      n'a pas d'importance : seul l'ordre dans lequel vous les deposez compte
      (1er = materiels, 2e = tickets, 3e = couts), et leurs entetes sont
      verifiees en consequence.
    </p>

    <!-- Choix des fichiers : peu importe leur nom, seul l'ordre compte -->
    <div class="champs">
      <label class="champ">
        <span>1er fichier CSV : materiels</span>
        <input type="file" accept=".csv" @change="choisirCsv($event, 1)" />
        <small>{{ nomFichier1 || 'Aucun fichier' }}</small>
      </label>

      <label class="champ">
        <span>2e fichier CSV : tickets</span>
        <input type="file" accept=".csv" @change="choisirCsv($event, 2)" />
        <small>{{ nomFichier2 || 'Aucun fichier' }}</small>
      </label>

      <label class="champ">
        <span>3e fichier CSV : couts</span>
        <input type="file" accept=".csv" @change="choisirCsv($event, 3)" />
        <small>{{ nomFichier3 || 'Aucun fichier' }}</small>
      </label>

      <label class="champ">
        <span>Archive .zip des images</span>
        <!-- L'archive est dezippee pendant l'import (cf runImport) : on y
             cherche uniquement les fichiers images, le reste est ignore. -->
        <input type="file" accept=".zip" @change="choisirImages($event)" />
        <small>{{ nomFichierImages || 'Aucune archive (optionnel)' }}</small>
      </label>
    </div>

    <button class="btn" :disabled="enCours || !toutEstLa" @click="lancerImport">
      {{ enCours ? 'Import en cours...' : "Lancer l'import" }}
    </button>

    <pre v-if="journal.length" class="journal">{{ journal.join('\n') }}</pre>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { runImport } from '../../services/importData.js'

// Contenu (texte) des 3 CSV une fois choisis par l'utilisateur.
const texte1 = ref(null)
const texte2 = ref(null)
const texte3 = ref(null)

// Archive .zip des images choisie par l'utilisateur (dezippee pendant l'import).
const zipImages = ref(null)

// Noms affiches a l'ecran.
const nomFichier1 = ref('')
const nomFichier2 = ref('')
const nomFichier3 = ref('')
const nomFichierImages = ref('')

const enCours = ref(false)
const journal = ref([])

// On a besoin des 3 CSV pour lancer l'import (les images sont optionnelles).
const toutEstLa = computed(() => texte1.value && texte2.value && texte3.value)

// Lit le fichier CSV choisi et garde son contenu texte.
async function choisirCsv(evenement, numero) {
  const fichier = evenement.target.files[0]
  if (!fichier) return
  const contenu = await fichier.text()

  if (numero === 1) { texte1.value = contenu; nomFichier1.value = fichier.name }
  if (numero === 2) { texte2.value = contenu; nomFichier2.value = fichier.name }
  if (numero === 3) { texte3.value = contenu; nomFichier3.value = fichier.name }
}

// On garde simplement l'archive choisie : c'est runImport qui la dezippe et
// y cherche les images au moment de l'import (cf services/imagesZip.js).
function choisirImages(evenement) {
  const fichier = evenement.target.files[0]
  if (!fichier) return
  zipImages.value = fichier
  nomFichierImages.value = fichier.name
}

function log(message) {
  journal.value.push(message)
}

async function lancerImport() {
  enCours.value = true
  journal.value = []
  try {
    const resume = await runImport(
      {
        texte1: texte1.value,
        texte2: texte2.value,
        texte3: texte3.value,
        zipImages: zipImages.value
      },
      log
    )
    log(
      'Resume : ' +
      resume.materiels + ' materiel(s), ' +
      resume.tickets + ' ticket(s), ' +
      resume.couts + ' cout(s) importe(s).'
    )
  } catch (erreur) {
    // L'erreur a deja ete affichee et le reset a deja ete relance par runImport.
    log('Import annule. Verifiez les fichiers puis recommencez.')
  } finally {
    enCours.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.info {
  color: #555;
  margin-bottom: 1.5rem;
}

.champs {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.champ {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 0.75rem 1rem;
}

.champ span {
  font-weight: 600;
}

.champ small {
  color: #777;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.journal {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: pre-wrap;
  max-height: 400px;
  overflow: auto;
}
</style>
