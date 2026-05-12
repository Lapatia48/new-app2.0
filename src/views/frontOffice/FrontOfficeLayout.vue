<script setup>
import { useCartStore } from '@/services/frontoffice/cartStore'

const { count } = useCartStore()
</script>

<template>
  <section class="frontoffice">
    <header class="header">
      <div class="brand">
        <h1>Boutique</h1>
        <p>Catalogue, panier, commandes</p>
      </div>
      <nav class="nav">
        <RouterLink to="/frontoffice/catalog" class="link">Accueil</RouterLink>
        <RouterLink to="/frontoffice/cart" class="link">Panier ({{ count }})</RouterLink>
        <RouterLink to="/frontoffice/account" class="link">Mon compte</RouterLink>
      </nav>
    </header>

    <main class="content">
      <RouterView />
    </main>
  </section>
</template>

<style scoped>
.frontoffice {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #ddd;
}

.brand h1 {
  margin: 0;
  font-size: 1.2rem;
}

.brand p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #666;
}

.nav {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.link {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
}

.link.router-link-active {
  border-color: #2563eb;
  color: #2563eb;
}

.content {
  padding: 0 0 1rem;
}
</style>
