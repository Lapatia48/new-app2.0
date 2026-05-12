<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBackOfficeDefaults, loginBackOffice } from '@/services/backofficeAuth'

const router = useRouter()
const route = useRoute()
const defaults = getBackOfficeDefaults()

const login = ref(defaults.login)
const password = ref(defaults.password)
const errorMessage = ref('')

function submitLogin() {
  const isValid = loginBackOffice(login.value, password.value)

  if (!isValid) {
    errorMessage.value = 'Identifiants invalides.'
    return
  }

  errorMessage.value = ''
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/backoffice'
  router.push(redirect)
}
</script>

<template>
  <section class="page">
    <h1>BackOffice login</h1>

    <form class="form" @submit.prevent="submitLogin">
      <label>
        Login
        <input v-model="login" type="text" autocomplete="username" />
      </label>

      <label>
        Mot de passe
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>

      <button type="submit">Se connecter</button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.page {
  background: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
  max-width: 420px;
}

.form {
  display: grid;
  gap: 0.75rem;
}

label {
  display: grid;
  gap: 0.25rem;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
}

button {
  padding: 0.5rem 0.75rem;
}

.error {
  color: #b91c1c;
}
</style>