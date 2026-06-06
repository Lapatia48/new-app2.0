<template>
  <div class="bo-layout">
    <!-- Menu du backoffice : present sur toutes les pages -->
    <nav class="bo-nav">
      <RouterLink :to="{ name: 'backoffice-home' }">Accueil</RouterLink>
      <RouterLink :to="{ name: 'bo-dashboard' }">Tableau de bord</RouterLink>
      <RouterLink :to="{ name: 'bo-tickets' }">Tickets</RouterLink>
      <RouterLink :to="{ name: 'bo-import' }">Import</RouterLink>
      <RouterLink :to="{ name: 'bo-reset' }">Reset</RouterLink>
    </nav>

    <!-- La page courante s'affiche ici -->
    <RouterView />
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<style scoped>
.bo-nav {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 1rem clamp(1rem, 4vw, 2rem);
  background: #ffffff;
  border-bottom: 1px solid #ddd;
}

.bo-nav a {
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  border: 1px solid transparent;
  font-weight: 500;
}

.bo-nav a:hover {
  border-color: #ddd;
}

.bo-nav a.router-link-active {
  color: #2563eb;
  border-color: #2563eb;
}
</style>
