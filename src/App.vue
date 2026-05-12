<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">

      <nav class="nav">
        <RouterLink to="/backoffice" class="nav-link">BackOffice</RouterLink>
        <RouterLink to="/frontoffice" class="nav-link">FrontOffice</RouterLink>
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
:global(:root) {
  --surface: #ffffff;
  --text: #111111;
  --muted: #666666;
  --accent: #2563eb;
  --border: #dddddd;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

:global(body) {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f5f5f5;
  color: var(--text);
}

:global(*) {
  box-sizing: border-box;
}

:global(a) {
  color: inherit;
  text-decoration: none;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: 1rem clamp(1rem, 4vw, 2rem);
  background: #ffffff;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #ffffff;
  background: var(--accent);
}

.brand-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.brand-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.nav {
  display: flex;
  justify-content: center;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.nav-link {
  padding: 0.35rem 0.7rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  background: transparent;
  border: 1px solid transparent;
}

.nav-link:hover {
  border-color: var(--border);
}

.nav-link.router-link-active {
  color: var(--accent);
  border-color: var(--accent);
}

.app-main {
  padding: 0 clamp(1rem, 4vw, 2rem) 1.5rem;
  flex: 1;
}

@media (max-width: 900px) {
  .app-header {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .nav {
    justify-content: flex-start;
  }
}
</style>
