<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { useFrontofficeSession } from '@/services/frontoffice/frontofficeSession'

const router = useRouter()
const { user, setUser, clearUser } = useFrontofficeSession()

const customers = ref([])
const loading = ref(false)
const error = ref('')
const query = ref('')

function toNumber(value, fallback = null) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildCustomer(node) {
  const id = toNumber(node.getAttribute('id') || getText(node, 'id'), null)
  const firstname = getText(node, 'firstname')
  const lastname = getText(node, 'lastname')
  const email = getText(node, 'email')
  const name = `${firstname} ${lastname}`.trim() || email || (id ? `Client #${id}` : 'Client')
  if (!id && !email) {
    return null
  }
  return {
    id,
    firstname,
    lastname,
    email,
    name
  }
}

const filteredCustomers = computed(() => {
  const trimmed = query.value.trim().toLowerCase()
  if (!trimmed) {
    return customers.value
  }
  return customers.value.filter((entry) => {
    const name = String(entry.name || '').toLowerCase()
    const email = String(entry.email || '').toLowerCase()
    return name.includes(trimmed) || email.includes(trimmed)
  })
})

async function loadCustomers() {
  loading.value = true
  error.value = ''
  try {
    const xml = await getXml('customers', {
      display: '[id,firstname,lastname,email]',
      limit: '0,1000'
    })
    const doc = parseXml(xml)
    const nodes = Array.from(doc.querySelectorAll('customer'))
    customers.value = nodes.map(buildCustomer).filter(Boolean)
  } catch (err) {
    error.value = err?.message || 'Erreur chargement utilisateurs.'
  } finally {
    loading.value = false
  }
}

function connectCustomer(entry) {
  if (!entry) {
    return
  }
  setUser(entry)
  router.push('/frontoffice/catalog')
}

function continueAnonymous() {
  clearUser()
  router.push('/frontoffice/catalog')
}

function isCurrent(entry) {
  if (!entry || !user.value) {
    return false
  }
  if (entry.id && user.value.id) {
    return Number(entry.id) === Number(user.value.id)
  }
  if (entry.email && user.value.email) {
    return String(entry.email).toLowerCase() === String(user.value.email).toLowerCase()
  }
  return false
}

onMounted(() => {
  loadCustomers()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Accueil</h2>
        <p>Choisissez un utilisateur pour continuer.</p>
      </div>
      <div class="actions">
        <button type="button" class="ghost" :disabled="loading" @click="loadCustomers">
          Actualiser
        </button>
      </div>
    </header>

    <div class="status">
      <p v-if="user?.id || user?.email" class="muted">Connecte: {{ user?.name || user?.email }}</p>
      <p v-else class="muted">Non connecte.</p>
    </div>

    <div class="filters">
      <label class="filter">
        Recherche
        <input v-model="query" type="search" placeholder="Nom ou email" />
      </label>
    </div>

    <p v-if="error" class="notice error">{{ error }}</p>
    <p v-else-if="loading" class="notice">Chargement...</p>

    <div v-else class="grid">
      <article class="card anon">
        <div>
          <h3>Utilisateur anonyme</h3>
          <p class="muted">Acces rapide sans selection.</p>
        </div>
        <button type="button" class="primary" @click="continueAnonymous">Continuer</button>
      </article>

      <article v-for="entry in filteredCustomers" :key="entry.id || entry.email" class="card">
        <div>
          <h3>{{ entry.name }}</h3>
          <p class="muted">{{ entry.email || 'Email non renseigne' }}</p>
        </div>
        <div class="card-actions">
          <span v-if="isCurrent(entry)" class="badge">Connecte</span>
          <button type="button" class="primary" @click="connectCustomer(entry)">
            Se connecter
          </button>
        </div>
      </article>

      <p v-if="!filteredCustomers.length" class="notice">Aucun utilisateur.</p>
    </div>
  </section>
</template>

<style scoped>
.page {
  background: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.filter {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
}

input {
  padding: 0.4rem;
  border: 1px solid #ccc;
}

.status {
  margin-bottom: 0.75rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.card {
  border: 1px solid #ddd;
  padding: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.card.anon {
  border-style: dashed;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

button,
.link {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

button.ghost {
  background: #fff;
}

.notice {
  padding: 0.6rem;
  border: 1px solid #eee;
  background: #fafafa;
}

.notice.error {
  border-color: #f5c2c2;
  background: #fdecec;
  color: #a62929;
}

.badge {
  display: inline-flex;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #d4edda;
  color: #1f6b2f;
  font-size: 0.75rem;
}

.muted {
  color: #666;
  font-size: 0.9rem;
}
</style>
