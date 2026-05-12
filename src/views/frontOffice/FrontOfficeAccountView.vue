<script setup>
import { useFrontofficeSession } from '@/services/frontoffice/frontofficeSession'

const { user, isLoggedIn, clearUser } = useFrontofficeSession()
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Mon compte</h2>
        <p>Infos utilisateur et commandes.</p>
      </div>
      <div class="actions" v-if="isLoggedIn">
        <button type="button" class="ghost" @click="clearUser">Deconnexion</button>
      </div>
    </header>

    <div v-if="!isLoggedIn" class="notice">
      <p>Vous n'etes pas connecte.</p>
      <RouterLink to="/frontoffice/checkout" class="link">Se connecter / creer un compte</RouterLink>
    </div>

    <div v-else class="card">
      <p><strong>{{ user?.name || 'Client' }}</strong></p>
      <p class="muted">{{ user?.email }}</p>

      <div class="actions">
        <RouterLink to="/frontoffice/orders" class="link">Voir mes demandes</RouterLink>
      </div>
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

.notice {
  padding: 0.6rem;
  border: 1px solid #eee;
  background: #fafafa;
}

.card {
  border: 1px solid #ddd;
  padding: 0.75rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.link,
button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

button.ghost {
  background: #fff;
}

.muted {
  color: #666;
  font-size: 0.9rem;
}
</style>
