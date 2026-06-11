<template>
  <div class="page">
    <h1>Configuration du tableau Kanban</h1>
    <p class="info">
      Choisissez la langue des entetes, la couleur de fond et le nom en malgache de chaque colonne.
    </p>

    <!-- Langue de l'entete des colonnes (un seul choix pour tout le tableau) -->
    <div class="ligne">
      <span class="titre">Langue entete</span>
      <div>
        <label>Langue affichee en haut des colonnes</label>
        <select v-model="config.langue">
          <option value="mg">Malgache (vaovao, efa manao, vita)</option>
          <option value="en">Anglais (New, In progress, Done)</option>
        </select>
      </div>
    </div>

    <!-- Colonne "Nouveau" -->
    <div class="ligne">
      <span class="titre">Nouveau</span>
      <div>
        <label>Couleur de fond</label>
        <input type="color" v-model="config.couleurNouveau" />
      </div>
      <div>
        <label>Nom en malgache</label>
        <input type="text" v-model="config.nomMgNouveau" placeholder="vaovao" />
      </div>
    </div>

    <!-- Colonne "In progress" -->
    <div class="ligne">
      <span class="titre">In progress</span>
      <div>
        <label>Couleur de fond</label>
        <input type="color" v-model="config.couleurEncours" />
      </div>
      <div>
        <label>Nom en malgache</label>
        <input type="text" v-model="config.nomMgEncours" placeholder="efa manao" />
      </div>
    </div>

    <!-- Colonne "Termine" -->
    <div class="ligne">
      <span class="titre">Termine</span>
      <div>
        <label>Couleur de fond</label>
        <input type="color" v-model="config.couleurTermine" />
      </div>
      <div>
        <label>Nom en malgache</label>
        <input type="text" v-model="config.nomMgTermine" placeholder="vita" />
      </div>
    </div>

    <div class="actions">
      <button :disabled="enCours" @click="enregistrerConfig">
        {{ enCours ? 'Enregistrement en cours...' : 'Enregistrer' }}
      </button>
      <!-- Remet les couleurs ET les entetes (noms + langue) d'origine dans le
           formulaire. Il faut ensuite cliquer "Enregistrer" pour appliquer. -->
      <button class="btn-secondaire" type="button" :disabled="enCours" @click="reinitialiser">
        Reinitialiser couleur de base
      </button>
    </div>

    <p v-if="message" class="message" :style="{ color: messageColor }">
      <span v-if="enCours" class="spinner"></span> {{ message }}
    </p>
  </div>
</template>

<script setup>
// ============================================================================
// KanbanConfig.vue
// ----------------------------------------------------------------------------
// Page BackOffice de personnalisation du tableau Kanban : langue de l'entete,
// couleur de fond et nom en malgache de chaque colonne (Nouveau / In progress
// / Termine). Ces valeurs sont lues et enregistrees aupres du backend Spring
// Boot (stockage SQLite) via le service kanbanConfig.js.
// ============================================================================

import { ref, onMounted } from 'vue'
import { getConfig, saveConfig, CONFIG_PAR_DEFAUT } from '../../services/kanbanConfig.js'

// Configuration affichee dans le formulaire (couleurs + noms + langue).
const config = ref({ ...CONFIG_PAR_DEFAUT })

// enCours : desactive les boutons et affiche le spinner pendant l'enregistrement.
// message / messageColor : texte et couleur du message affiche sous les boutons.
const enCours = ref(false)
const message = ref('')
const messageColor = ref('#374151')

// Petit utilitaire : "attendre(1000)" renvoie une promesse qui se termine
// apres 1000 millisecondes. Sert a garder le loading visible au moins 1
// seconde meme si le serveur repond tres vite.
function attendre(millisecondes) {
  return new Promise((resoudre) => setTimeout(resoudre, millisecondes))
}

// Au chargement de la page : on va chercher la config existante et on
// remplit le formulaire avec ses valeurs.
onMounted(async () => {
  config.value = await getConfig()
})

// Au clic sur "Enregistrer" : on envoie la config au backend (qui l'ecrit
// dans SQLite), avec un loading d'au moins 1 seconde.
async function enregistrerConfig() {
  enCours.value = true
  messageColor.value = '#374151'
  message.value = 'Enregistrement en cours...'

  const [ok] = await Promise.all([
    saveConfig(config.value),
    attendre(1000)
  ])

  if (ok) {
    messageColor.value = '#027a48'
    message.value = 'Configuration enregistree !'
  } else {
    messageColor.value = '#b42318'
    message.value = 'Erreur lors de l\'enregistrement.'
  }

  enCours.value = false
}

// Au clic sur "Reinitialiser" : on remet les valeurs d'origine DANS LE
// FORMULAIRE. Rien n'est encore enregistre : il faut cliquer "Enregistrer"
// pour appliquer.
function reinitialiser() {
  config.value = { ...CONFIG_PAR_DEFAUT }
  messageColor.value = '#374151'
  message.value = 'Valeurs d\'origine restaurees. Cliquez sur "Enregistrer" pour appliquer.'
}
</script>

<style scoped>
.page {
  max-width: 640px;
  margin: 2rem auto;
  padding: 0 1rem 2rem;
  color: #1f2937;
}

h1 {
  font-size: 1.4rem;
}

.info {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.ligne {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.8rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.ligne .titre {
  width: 130px;
  font-weight: 600;
}

label {
  display: block;
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.2rem;
}

input[type="text"],
select {
  padding: 0.45rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

input[type="color"] {
  width: 48px;
  height: 38px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  margin-top: 1rem;
}

button {
  padding: 0.7rem 1.4rem;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

/* Quand un bouton est desactive (pendant l'enregistrement) : grise. */
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Le bouton "Reinitialiser" est secondaire : fond gris, plus discret. */
.btn-secondaire {
  background: #6b7280;
}

.message {
  margin-top: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Petit rond qui tourne (loading), affiche pendant l'enregistrement. */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-top-color: #2563eb;
  border-radius: 50%;
  display: inline-block;
  animation: tourner 0.7s linear infinite;
}

@keyframes tourner {
  to { transform: rotate(360deg); }
}
</style>
