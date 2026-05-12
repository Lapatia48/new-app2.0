import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'new-app2-frontoffice-user'
const userState = ref(loadUser())

function loadUser() {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    return normalizeUser(parsed)
  } catch {
    return null
  }
}

function saveUser(user) {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

function toNumber(value, fallback = null) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeUser(user) {
  if (!user) {
    return null
  }
  const id = toNumber(user.id, null)
  const email = String(user.email || '').trim()
  const firstname = String(user.firstname || '').trim()
  const lastname = String(user.lastname || '').trim()
  const name = String(user.name || `${firstname} ${lastname}`.trim() || email).trim()

  if (!email && !id) {
    return null
  }

  return {
    id,
    email,
    firstname,
    lastname,
    name
  }
}

watch(
  userState,
  (value) => {
    if (value) {
      saveUser(value)
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  },
  { deep: true }
)

export function useFrontofficeSession() {
  const isLoggedIn = computed(() => Boolean(userState.value?.id || userState.value?.email))

  function setUser(user) {
    userState.value = normalizeUser(user)
  }

  function clearUser() {
    userState.value = null
  }

  return {
    user: userState,
    isLoggedIn,
    setUser,
    clearUser
  }
}
