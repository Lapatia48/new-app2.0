<template>
  <div class="kanban-page">
    <h1>Tableau des tickets (Kanban)</h1>

    <!-- Message d'erreur eventuel (chargement, mise a jour...) -->
    <p v-if="erreur" class="erreur">{{ erreur }}</p>

    <!-- ================= LES 3 COLONNES ================= -->
    <div class="colonnes">
      <!--
        Une colonne par statut. On parcourt le tableau "COLONNES" (fixe : 3
        statuts seulement). @dragover.prevent autorise le depot, et @drop
        appelle deposer() avec le statut de CETTE colonne.
        Le :style applique la couleur de fond venue de la config (SQLite).
      -->
      <div
        v-for="colonne in COLONNES"
        :key="colonne.statutId"
        class="colonne"
        :style="{ background: couleurColonne(colonne) }"
        @dragover.prevent
        @drop="deposer(colonne.statutId)"
      >
        <!-- En-tete : UN seul titre (malgache OU anglais selon la config) +
             le nombre total de tickets. La langue vient du backend. -->
        <div class="colonne-entete">
          <span class="colonne-titre">{{ entete(colonne) }}</span>
          <!-- Nombre total de tickets dans la colonne -->
          <span class="badge">{{ ticketsDe(colonne.statutId).length }}</span>
        </div>

        <!-- Les cartes (un ticket = une carte que l'on peut glisser) -->
        <button
          v-for="t in ticketsDe(colonne.statutId)"
          :key="t.id"
          class="carte"
          draggable="true"
          @dragstart="debutGlisser(t)"
          @click="ouvrirDetails(t)"
        >
          <span class="carte-nom">{{ t.name }}</span>
          <span class="carte-id">#{{ t.id }}</span>
        </button>

        <!-- Bouton "Ajouter 1 ticket" (uniquement sous la colonne Nouveau,
             comme sur la maquette). Il ouvre la page de creation. -->
        <button
          v-if="colonne.statutId === 1"
          class="ajouter"
          @click="creerNouveauTicket"
        >
          + Ajouter 1 ticket
        </button>
      </div>
    </div>

    <!-- ================= BOITE DE DIALOGUE "TERMINER" ================= -->
    <!--
      S'affiche UNIQUEMENT quand on fait glisser un ticket vers la colonne
      "Termine" : ce changement de statut a besoin d'une info supplementaire
      (la solution / le commentaire de cloture). Pour les autres colonnes, le
      deplacement est immediat, sans dialogue.
    -->
    <div v-if="dialogueTermine" class="overlay" @click.self="annulerTermine">
      <div class="dialogue">
        <h2>Terminer le ticket</h2>
        <p>Indiquez la solution apportee avant de passer le ticket en "Termine".</p>
        <textarea
          v-model="solution"
          rows="4"
          placeholder="Decrivez la solution (obligatoire)"
        ></textarea>

        <label class="supercost-label">Cout supplementaire (supercost)</label>
        <input
          v-model="supercost"
          type="number"
          min="0"
          step="0.01"
          placeholder="ex: 100"
          class="supercost-input"
        />

        <div class="dialogue-actions">
          <button class="btn-secondaire" @click="annulerTermine">Annuler</button>
          <button class="btn" :disabled="!solution.trim()" @click="validerTermine">
            Valider
          </button>
        </div>
      </div>
    </div>

    <!-- ================= FICHE DETAILS D'UN TICKET ================= -->
    <!-- S'affiche au clic sur une carte : montre TOUS les details du ticket. -->
    <div v-if="ticketSelectionne" class="overlay" @click.self="fermerDetails">
      <div class="fiche">
        <button class="fermer" @click="fermerDetails">✕</button>
        <h2>{{ ticketSelectionne.name }}</h2>

        <dl>
          <dt>Numero</dt>
          <dd>#{{ ticketSelectionne.id }}</dd>

          <dt>Type</dt>
          <dd>{{ nomType(ticketSelectionne.type) }}</dd>

          <dt>Statut</dt>
          <dd>{{ nomStatut(ticketSelectionne.status) }}</dd>

          <dt>Priorite</dt>
          <dd>{{ nomPriorite(ticketSelectionne.priority) }}</dd>

          <dt>Date</dt>
          <dd>{{ ticketSelectionne.date || '-' }}</dd>

          <dt>Description</dt>
          <dd class="description">{{ ticketSelectionne.content || '-' }}</dd>
        </dl>

        <h3>Materiels rattaches</h3>
        <ul v-if="materiels.length" class="materiels">
          <li v-for="m in materiels" :key="m.itemtype + '-' + m.items_id">
            {{ nomMateriel(m) }} <small>({{ m.itemtype }})</small>
          </li>
        </ul>
        <p v-else class="muted">Aucun materiel rattache.</p>

        <h3>Couts</h3>
        <table v-if="couts.length" class="couts">
          <thead>
            <tr>
              <th>Duree (s)</th>
              <th>Cout temps</th>
              <th>Cout fixe</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in couts" :key="c.id">
              <td>{{ c.actiontime }}</td>
              <td>{{ c.cost_time }}</td>
              <td>{{ c.cost_fixed }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Aucun cout pour ce ticket.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// ============================================================================
// TicketkabanPage.vue
// ----------------------------------------------------------------------------
// Tableau Kanban des tickets GLPI avec 3 colonnes : Nouveau / In progress /
// Termine. On peut :
//   - voir le nombre total de tickets par colonne ;
//   - creer un ticket ("+ Ajouter 1 ticket") ;
//   - glisser une carte d'une colonne vers N'IMPORTE QUELLE autre colonne ;
//   - cliquer une carte pour voir tous ses details.
//
// Regle metier : passer un ticket en "Termine" demande une info en plus (la
// solution). On ouvre alors une boite de dialogue. Les autres deplacements
// sont immediats.
//
// Les couleurs de fond des colonnes et les noms de statut en malgache viennent
// du backend Spring Boot (stockes en SQLite), via le service kanbanConfig.js.
// ============================================================================

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as ticket from '../../services/ticket.js'
import * as ticketCost from '../../services/ticketCost.js'
import * as itemTicket from '../../services/itemTicket.js'
import * as itilSolution from '../../services/itilSolution.js'
import * as supercostService from '../../services/supercost.js'
import { getConfig } from '../../services/kanbanConfig.js'

const router = useRouter()

// --- Definition FIXE des 3 colonnes affichees ---
// statutId   : le code de statut GLPI (1 = Nouveau, 2 = En cours, 5 = Resolu).
// nomEn      : le nom anglais (fige ici), affiche si la langue choisie est "en".
// cleCouleur : nom du champ de couleur dans la config (cote SQLite).
// cleNomMg   : nom du champ "nom malgache" dans la config (cote SQLite).
const COLONNES = [
  { statutId: 1, nomEn: 'Nouveau', cleCouleur: 'couleurNouveau', cleNomMg: 'nomMgNouveau' },
  { statutId: 2, nomEn: 'In progress', cleCouleur: 'couleurEncours', cleNomMg: 'nomMgEncours' },
  { statutId: 6, nomEn: 'Terminé', cleCouleur: 'couleurTermine', cleNomMg: 'nomMgTermine' }
]

// Statut "Termine" affiche dans la 3e colonne. Centralise ici pour que le
// dialogue de cloture (solution) et la validation utilisent la meme valeur.
const STATUT_TERMINE = 6

// --- Etat de la page (les "boites" reactives) ---
const tickets = ref([])            // tous les tickets charges depuis GLPI
const config = ref({})             // couleurs + noms malgaches (depuis SQLite)
const erreur = ref(null)

// Carte en cours de glissement (memorisee au moment du dragstart).
const ticketGlisse = ref(null)

// Boite de dialogue "Terminer" : visible ou non, + le texte de la solution.
const dialogueTermine = ref(false)
const solution = ref('')
const supercost = ref('')

// Fiche details : le ticket clique + ses sous-donnees (couts, materiels).
const ticketSelectionne = ref(null)
const couts = ref([])
const materiels = ref([])
const nomsMateriels = ref({})

// ----------------------------------------------------------------------------
// Petites fonctions d'affichage (traduction des codes GLPI en texte lisible).
// ----------------------------------------------------------------------------
function nomType(type) {
  return Number(type) === 2 ? 'Demande' : 'Incident'
}

function nomPriorite(priorite) {
  const noms = { 1: 'Tres basse', 2: 'Basse', 3: 'Moyenne', 4: 'Haute', 5: 'Tres haute' }
  return noms[priorite] || priorite
}

function nomStatut(statut) {
  const noms = { 1: 'Nouveau', 2: 'En cours', 3: 'Planifie', 4: 'En attente', 5: 'Resolu', 6: 'Clos' }
  return noms[statut] || statut
}

function nomMateriel(lien) {
  return nomsMateriels.value[lien.itemtype + '-' + lien.items_id] || ('#' + lien.items_id)
}

// Couleur de fond d'une colonne (lue dans la config ; defaut blanc casse).
function couleurColonne(colonne) {
  return config.value[colonne.cleCouleur] || '#f3f4f6'
}

// Entete affichee en haut d'une colonne, dans la langue choisie cote backend.
//   - langue "en" : on affiche le nom anglais fige (New / In progress / Done) ;
//   - sinon (langue "mg" par defaut) : on affiche le nom malgache de la config,
//     et a defaut le nom anglais pour ne jamais laisser l'entete vide.
function entete(colonne) {
  if (config.value.langue === 'en') {
    return colonne.nomEn
  }
  return config.value[colonne.cleNomMg] || colonne.nomEn
}

// Renvoie les tickets d'un statut donne. Sert a remplir une colonne ET a
// compter ses tickets ({{ ticketsDe(...).length }}).
function ticketsDe(statutId) {
  return tickets.value.filter((t) => Number(t.status) === statutId)
}

// ----------------------------------------------------------------------------
// Creation : on redirige vers la page "Nouveau ticket" deja existante.
// ----------------------------------------------------------------------------
function creerNouveauTicket() {
  router.push({ name: 'fo-new-ticket' })
}

// ----------------------------------------------------------------------------
// GLISSER-DEPOSER
// ----------------------------------------------------------------------------
// 1) Debut du glissement : on retient quel ticket est deplace.
function debutGlisser(t) {
  ticketGlisse.value = t
}

// 2) Depot sur une colonne : "nouveauStatut" est le statut de la colonne cible.
function deposer(nouveauStatut) {
  const t = ticketGlisse.value
  if (!t) return

  // Si on relache sur la meme colonne, il n'y a rien a changer.
  if (Number(t.status) === nouveauStatut) {
    ticketGlisse.value = null
    return
  }

  // Cas special : passer en "Termine" (Clos) demande une info en plus (solution).
  // On ouvre la boite de dialogue ; le changement se fera apres validation.
  if (nouveauStatut === STATUT_TERMINE) {
    solution.value = ''
    supercost.value = ''
    dialogueTermine.value = true
    return
  }

  // Tous les autres deplacements sont immediats.
  changerStatut(t.id, nouveauStatut)
}

// 3a) Validation de la boite "Terminer" : on enregistre la solution comme
//     reponse (suivi) au ticket, PUIS on passe le ticket en "Termine".
async function validerTermine() {
  const t = ticketGlisse.value
  if (!t) return

  try {
    await itilSolution.create({
      itemtype: 'Ticket',
      items_id: t.id,
      content: solution.value
    })
    if (supercost.value !== '') {
      await supercostService.save(t.id, Number(supercost.value))
    }
    await changerStatut(t.id, STATUT_TERMINE)
  } catch (e) {
    erreur.value = 'Impossible de terminer le ticket : ' + e.message
  } finally {
    dialogueTermine.value = false
    solution.value = ''
    supercost.value = ''
  }
}

// 3b) Annulation de la boite "Terminer" : on ne change rien.
function annulerTermine() {
  dialogueTermine.value = false
  solution.value = ''
  supercost.value = ''
  ticketGlisse.value = null
}

// Met a jour le statut d'un ticket dans GLPI puis recharge la liste pour que
// la carte apparaisse dans la bonne colonne.
async function changerStatut(id, nouveauStatut) {
  try {
    await ticket.update(id, { status: nouveauStatut })
    tickets.value = await ticket.getAll()
  } catch (e) {
    erreur.value = 'Mise a jour du statut impossible : ' + e.message
  } finally {
    ticketGlisse.value = null
  }
}

// ----------------------------------------------------------------------------
// DETAILS : au clic sur une carte, on charge couts + materiels et on affiche
// la fiche.
// ----------------------------------------------------------------------------
async function ouvrirDetails(t) {
  ticketSelectionne.value = t
  couts.value = []
  materiels.value = []
  try {
    couts.value = (await ticketCost.getAllForTicket(t.id)) || []
    materiels.value = (await itemTicket.getAllForTicket(t.id)) || []
  } catch (e) {
    erreur.value = e.message
  }
}

function fermerDetails() {
  ticketSelectionne.value = null
}

// ----------------------------------------------------------------------------
// Chargement initial : les tickets (GLPI) + la config (couleurs/noms malgaches).
// ----------------------------------------------------------------------------
onMounted(async () => {
  try {
    tickets.value = await ticket.getAll()
  } catch (e) {
    erreur.value = e.message
  }
  // La config a sa propre securite (config par defaut si backend eteint),
  // donc pas besoin de try/catch ici.
  config.value = await getConfig()
})
</script>

<style scoped>
.kanban-page {
  padding: 1.5rem;
}

/* Les 3 colonnes cote a cote */
.colonnes {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.colonne {
  flex: 1;
  min-width: 220px;
  border-radius: 10px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.colonne-entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.colonne-titre {
  font-weight: 700;
  display: block;
}

/* La petite pastille avec le nombre de tickets */
.badge {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Une carte = un ticket */
.carte {
  background: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.7rem 0.8rem;
  text-align: left;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.carte:active {
  cursor: grabbing;
}

.carte-nom {
  font-weight: 600;
}

.carte-id {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Bouton "Ajouter 1 ticket" */
.ajouter {
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  padding: 0.6rem;
  cursor: pointer;
  color: #374151;
  font-size: 0.85rem;
}

/* Voile sombre derriere les boites de dialogue et la fiche */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* Boite de dialogue "Terminer" */
.dialogue {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
}

.dialogue textarea,
.supercost-input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
}

.supercost-label {
  display: block;
  font-weight: 600;
  margin-top: 0.8rem;
  margin-bottom: 0.3rem;
}

.dialogue-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondaire {
  padding: 0.6rem 1.2rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

/* Fiche details */
.fiche {
  position: relative;
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  overflow: auto;
}

.fermer {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  border: none;
  background: none;
  font-size: 1.1rem;
  cursor: pointer;
}

.fiche dt {
  font-weight: 600;
  margin-top: 0.6rem;
}

.fiche dd {
  margin: 0;
}

.description {
  white-space: pre-wrap;
}

.materiels {
  margin: 0;
  padding-left: 1.2rem;
}

.couts {
  width: 100%;
  border-collapse: collapse;
}

.couts th,
.couts td {
  border: 1px solid #e5e7eb;
  padding: 0.3rem 0.5rem;
  text-align: left;
}

.muted {
  color: #9ca3af;
}

.erreur {
  color: #b42318;
}
</style>
