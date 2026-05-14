<script setup>
import { ref, onMounted } from 'vue'
import { buildOrderConfig } from '@/services/order/commandeAchatService'
import { createCustomer, findCustomerIdByEmail, readCustomer } from '@/services/entities/customersService'
import { useFrontofficeSession } from '@/services/frontoffice/frontofficeSession'

const emit = defineEmits(['next'])
const { user, setUser } = useFrontofficeSession()

const mode = ref('login')
const loading = ref(false)
const error = ref('')

const loginEmail = ref('')
const loginPassword = ref('')

const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')

onMounted(() => {
  const current = user?.value
  if (current?.id || current?.email) {
    emit('next', current)
  }
})

function pickText(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'object' && value._text !== undefined && value._text !== null) {
    return String(value._text)
  }
  return ''
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getCustomerInfo(raw) {
  if (!raw) return null
  const customer = raw.customer || raw
  const id = toNumber(customer.id, 0)
  const firstname = pickText(customer.firstname)
  const lastname = pickText(customer.lastname)
  const email = pickText(customer.email)
  const name = `${firstname} ${lastname}`.trim() || email
  return { id, firstname, lastname, email, name }
}

async function submitLogin() {
  error.value = ''
  const email = loginEmail.value.trim()
  const password = loginPassword.value.trim()
  if (!email || !password) {
    error.value = 'Email et mot de passe requis.'
    return
  }

  loading.value = true
  try {
    const existingId = await findCustomerIdByEmail(email)
    if (!existingId) {
      throw new Error('Compte introuvable.')
    }
    const data = await readCustomer(existingId)
    const info = getCustomerInfo(data) || { id: existingId, email, name: email }
    setUser(info)
    emit('next', info)
  } catch (err) {
    error.value = err?.message || 'Connexion impossible.'
  } finally {
    loading.value = false
  }
}

async function submitRegister() {
  error.value = ''
  const name = registerName.value.trim()
  const email = registerEmail.value.trim()
  const password = registerPassword.value.trim()

  if (!name || !email || !password) {
    error.value = 'Tous les champs sont requis.'
    return
  }

  loading.value = true
  try {
    const existingId = await findCustomerIdByEmail(email)
    if (existingId) {
      throw new Error('Compte deja existant.')
    }
    const config = buildOrderConfig()
    const parts = name.split(' ').filter(Boolean)
    const firstname = parts.shift() || name
    const lastname = parts.join(' ') || firstname

    const id = await createCustomer({
      id_lang: config.langId,
      id_shop: config.shopId,
      id_shop_group: config.shopGroupId,
      id_default_group: config.customerGroupId,
      firstname,
      lastname,
      email,
      passwd: password,
      active: 1
    })

    const info = { id, firstname, lastname, email, name: `${firstname} ${lastname}`.trim() }
    setUser(info)
    emit('next', info)
  } catch (err) {
    error.value = err?.message || 'Creation impossible.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="step">
    <div class="tabs">
      <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">
        Se connecter
      </button>
      <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">
        Creer un compte
      </button>
    </div>

    <form v-if="mode === 'login'" class="form" @submit.prevent="submitLogin">
      <label>
        Email
        <input v-model="loginEmail" type="email" autocomplete="username" />
      </label>
      <label>
        Mot de passe
        <input v-model="loginPassword" type="password" autocomplete="current-password" />
      </label>
      <button type="submit" :disabled="loading">{{ loading ? 'Connexion...' : 'Connexion' }}</button>
    </form>

    <form v-else class="form" @submit.prevent="submitRegister">
      <label>
        Nom complet
        <input v-model="registerName" type="text" />
      </label>
      <label>
        Email
        <input v-model="registerEmail" type="email" autocomplete="email" />
      </label>
      <label>
        Mot de passe
        <input v-model="registerPassword" type="password" autocomplete="new-password" />
      </label>
      <button type="submit" :disabled="loading">{{ loading ? 'Creation...' : 'Creer' }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.step {
  display: grid;
  gap: 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tabs button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  cursor: pointer;
}

.tabs button.active {
  border-color: #2563eb;
  color: #2563eb;
  background: #eef4ff;
}

.form {
  display: grid;
  gap: 0.75rem;
}

label {
  display: grid;
  gap: 0.3rem;
}

input {
  padding: 0.4rem;
  border: 1px solid #ccc;
}

button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #b91c1c;
  margin: 0;
}
</style>
