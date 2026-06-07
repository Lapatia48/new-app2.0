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
// ============================================================================
// FrontOfficeLayout.vue
// ----------------------------------------------------------------------------
// Cadre commun a toutes les pages du FrontOffice (le menu du haut + la zone
// ou s'affiche la page courante). Identique dans son fonctionnement a
// BackOfficeLayout.vue : voir ce fichier pour le detail des explications.
// ============================================================================

// RouterLink = lien de navigation interne (genere un <a>, change de page
// sans recharger tout le site).
// RouterView  = "trou" dans la mise en page ou s'affiche la page courante,
// determinee automatiquement par Vue Router selon l'URL.
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
