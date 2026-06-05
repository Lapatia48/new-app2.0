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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('admin')
const password = ref('admin')
const errorMessage = ref('')

const router = useRouter()
const expectedUsername = import.meta.env.VITE_BACKOFFICE_LOGIN
const expectedPassword = import.meta.env.VITE_BACKOFFICE_PASSWORD

function login() {
    if (
        username.value === expectedUsername &&
        password.value === expectedPassword
    ) {
        errorMessage.value = ''
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