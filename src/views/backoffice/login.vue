<template>
    <div class="login-container">
        <form class="login-form" @submit.prevent="login">
            <h2>Connexion BackOffice</h2>

            <div class="form-group">
                <label for="username">Nom d'utilisateur</label>
                <input
                    id="username"
                    v-model="username"
                    type="text"
                    required
                />
            </div>

            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input
                    id="password"
                    v-model="password"
                    type="password"
                    required
                />
            </div>

            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

            <button type="submit">Se connecter</button>
        </form>
    </div>
</template>

<script setup>
// ============================================================================
// login.vue
// ----------------------------------------------------------------------------
// Page de connexion au BackOffice. Tres simple "authentification" cote
// front : on compare ce que l'utilisateur tape avec des identifiants stockes
// dans le fichier .env du projet (PAS dans une base de donnees ni une vraie
// API d'authentification). C'est volontairement minimal : suffisant pour
// proteger l'acces au BackOffice dans ce projet, mais ce n'est PAS une
// securite robuste (les valeurs .env finissent dans le code envoye au
// navigateur, donc ne pas y mettre de vrais mots de passe sensibles).
// ============================================================================

import { ref } from 'vue'
import { useRouter } from 'vue-router'

// v-model sur les <input> du <template> relie automatiquement la valeur
// tapee par l'utilisateur a ces refs : quand l'utilisateur tape, "username"
// et "password" se mettent a jour tout seuls (et inversement).
// Valeurs de depart 'admin' : pre-remplissage pratique pour les tests/demo.
const username = ref('admin')
const password = ref('admin')
const errorMessage = ref('')

// useRouter() donne acces au "routeur" (l'outil qui gere le changement de
// page). router.push({ name: ... }) permet de changer de page depuis le
// script (ici, rediriger vers l'accueil du BackOffice apres connexion).
const router = useRouter()

// import.meta.env.XXX = lit une variable d'environnement definie dans le
// fichier .env a la racine du projet (ex: VITE_BACKOFFICE_LOGIN=admin).
// Vite (l'outil de build) remplace ces variables par leur valeur au moment
// de la compilation : elles sont donc visibles dans le code final.
const expectedUsername = import.meta.env.VITE_BACKOFFICE_LOGIN
const expectedPassword = import.meta.env.VITE_BACKOFFICE_PASSWORD

// Appelee a la soumission du formulaire (@submit.prevent="login" dans le
// <template> : ".prevent" empeche le navigateur de recharger la page, ce
// qui est le comportement par defaut d'un <form> HTML).
function login() {
    if (
        username.value === expectedUsername &&
        password.value === expectedPassword
    ) {
        errorMessage.value = ''
        // Redirige vers la page d'accueil du BackOffice (definie par son
        // "name" dans la configuration du routeur, pas par son URL en dur).
        router.push({ name: 'backoffice-home' })
        return
    }

    errorMessage.value = 'Identifiants incorrects.'
}
</script>

<style scoped>
.login-container {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f4f4f4;
}

.login-form {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    width: 350px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.login-form h2 {
    text-align: center;
    margin-bottom: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
}

.form-group label {
    margin-bottom: 0.5rem;
}

.form-group input {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.error-message {
    margin: 0 0 1rem;
    color: #b42318;
    font-size: 0.95rem;
}

button {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
</style>