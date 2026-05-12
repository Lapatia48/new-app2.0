<script setup>
import { useRouter } from 'vue-router'
import { logoutBackOffice } from '@/services/backofficeAuth'

const router = useRouter()

function logout() {
  logoutBackOffice()
  router.push('/backoffice/login')
}
</script>

<template>
  <section class="page">
    <h1>BackOffice</h1>

    <div class="actions">
      <RouterLink to="/backoffice/import">Import fichiers</RouterLink>
      <RouterLink to="/backoffice/import-oneshot">Import OneShot</RouterLink>
      <RouterLink to="/backoffice/orders">Gestion commandes</RouterLink>
      <RouterLink to="/backoffice/reset">Reset data</RouterLink>
      <button type="button" @click="logout">Logout</button>
    </div>
  </section>
</template>

<style scoped>
.page {
  background: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

a,
button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
}
</style>