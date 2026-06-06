<template>
  <div class="fo-layout">
    <!-- Menu du frontoffice : present sur toutes les pages -->
    <nav class="fo-nav">
      <RouterLink :to="{ name: 'frontoffice' }">Accueil</RouterLink>
      <RouterLink :to="{ name: 'fo-elements' }">Elements</RouterLink>
      <RouterLink :to="{ name: 'fo-new-ticket' }">Nouveau ticket</RouterLink>
    </nav>

    <RouterView />
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<style scoped>
.fo-nav {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 1rem clamp(1rem, 4vw, 2rem);
  background: #ffffff;
  border-bottom: 1px solid #ddd;
}

.fo-nav a {
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  border: 1px solid transparent;
  font-weight: 500;
}

.fo-nav a:hover {
  border-color: #ddd;
}

.fo-nav a.router-link-active {
  color: #2563eb;
  border-color: #2563eb;
}
</style>
