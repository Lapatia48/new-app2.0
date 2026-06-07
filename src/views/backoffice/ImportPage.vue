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
// ============================================================================
// ImportPage.vue
// ----------------------------------------------------------------------------
// Page "Importer les donnees" : l'utilisateur choisit 3 fichiers CSV (dans un
// ordre precis : materiels, tickets, couts) + une archive .zip d'images
// (optionnelle), puis clique sur "Lancer l'import". Le vrai travail d'import
// (lecture des CSV, creation des objets dans GLPI...) est fait par le service
// runImport() ; cette page se contente de recuperer les fichiers choisis,
// d'appeler le service et d'afficher sa progression dans un journal.
//
// Rappel rapide sur ref() : ref(valeur) cree une "boite" reactive. On la lit
// et on la modifie via ".value" dans le script (ex: enCours.value = true) ;
// dans le <template>, Vue enleve automatiquement le ".value".
// computed(fn) calcule une valeur derivee d'autres refs et se recalcule
// automatiquement des que l'une d'elles change.
// ============================================================================

import { ref, computed } from 'vue'
import { runImport } from '../../services/importData.js'

// Contenu (texte) des 3 CSV une fois choisis par l'utilisateur. On part de
// `null` pour bien distinguer "fichier pas encore choisi" de "fichier vide".
const texte1 = ref(null)
const texte2 = ref(null)
const texte3 = ref(null)

// Archive .zip des images choisie par l'utilisateur (dezippee pendant l'import).
const zipImages = ref(null)

// Noms de fichiers affiches a l'ecran (juste pour informer l'utilisateur de
// ce qu'il a selectionne ; n'a aucun impact sur l'import lui-meme).
const nomFichier1 = ref('')
const nomFichier2 = ref('')
const nomFichier3 = ref('')
const nomFichierImages = ref('')

// enCours : desactive le bouton et affiche "Import en cours..." pendant le
// traitement. journal : liste des messages affiches a l'ecran au fur et a
// mesure (cf fonction log() plus bas et runImport qui l'appelle).
const enCours = ref(false)
const journal = ref([])

// Le bouton "Lancer l'import" reste desactive tant que les 3 CSV ne sont pas
// choisis (l'archive d'images est optionnelle, donc absente de ce test).
// "texte1.value && texte2.value && texte3.value" vaut "vrai" seulement si
// les 3 valeurs sont "remplies" (ni null, ni chaine vide).
const toutEstLa = computed(() => texte1.value && texte2.value && texte3.value)

// Appelee quand l'utilisateur choisit un des 3 fichiers CSV (voir @change
// dans le <template>). "numero" (1, 2 ou 3) indique quelle ref remplir.
//
// evenement.target.files[0] = le 1er fichier choisi dans le champ <input
// type="file">. fichier.text() lit son contenu et renvoie une "Promise"
// (une valeur "pas encore prete" mais qu'on recuperera plus tard) : c'est
// pour ca que la fonction est "async" et qu'on utilise "await" pour
// attendre que la lecture du fichier soit terminee avant de continuer.
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
// Pas besoin de "async/await" ici : contrairement a un CSV, on ne lit pas
// le contenu du fichier tout de suite, on le transmet tel quel.
function choisirImages(evenement) {
  const fichier = evenement.target.files[0]
  if (!fichier) return
  zipImages.value = fichier
  nomFichierImages.value = fichier.name
}

// Ajoute une ligne au journal affiche a l'ecran. Cette fonction est passee
// en parametre a runImport(), qui l'appelle a chaque etape importante de
// l'import pour que l'utilisateur voie la progression en temps reel.
function log(message) {
  journal.value.push(message)
}

// Declenchee par le clic sur le bouton "Lancer l'import" (@click).
async function lancerImport() {
  enCours.value = true
  journal.value = []
  try {
    // On transmet le contenu texte des 3 CSV + l'archive d'images (qui peut
    // etre null si l'utilisateur ne l'a pas choisie) au service d'import,
    // ainsi que la fonction log pour qu'il puisse afficher sa progression.
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
    // Toujours execute (succes ou erreur) : on reactive le bouton.
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
