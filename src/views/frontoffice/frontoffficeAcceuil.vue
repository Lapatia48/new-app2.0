<template>
  <div class="fo-home">
    <section class="hero-card">
      <p class="eyebrow">FrontOffice</p>
      <h1>Bienvenue</h1>
      <p>Consultez les elements ou creez un ticket d'assistance.</p>

      <div class="cartes">
        <RouterLink :to="{ name: 'fo-elements' }" class="carte">Voir les elements</RouterLink>
        <RouterLink :to="{ name: 'fo-new-ticket' }" class="carte">Creer un ticket</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
// ============================================================================
// frontoffficeAcceuil.vue
// ----------------------------------------------------------------------------
// Page d'accueil du FrontOffice (espace utilisateur final, par opposition au
// BackOffice qui est reserve a l'administration). Comme BackOfficeHome.vue,
// c'est une simple page de liens : aucune donnee a charger, donc pas de
// ref/computed/onMounted.
// ============================================================================

// RouterLink = lien de navigation interne fourni par Vue Router (change de
// page sans recharger tout le site).
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.fo-home {
  display: grid;
  place-items: center;
  padding: 2rem;
}

.hero-card {
  width: min(100%, 640px);
  padding: 3rem;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.15);
  color: #0f172a;
}

.eyebrow {
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.8rem;
  font-weight: 700;
}

h1 {
  margin: 0 0 1rem;
  font-size: clamp(2rem, 4vw, 3rem);
}

.cartes {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.carte {
  display: block;
  padding: 1rem;
  text-align: center;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.carte:hover {
  background: #1d4ed8;
}
</style>
