<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <div class="brand-mark">PS</div>
        <div>
          <p class="brand-title">Presta Data Studio</p>
          <p class="brand-subtitle">XML-first data tools</p>
        </div>
      </div>
      <nav class="nav">
        <RouterLink to="/data" class="nav-link">Data</RouterLink>
        <RouterLink to="/data/import" class="nav-link">Import CSV</RouterLink>
        <RouterLink to="/data/reset" class="nav-link">Reset Data</RouterLink>
      </nav>
      <div class="header-meta">
        <span class="meta-pill">XML only</span>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <span>PrestaShop data tooling built on Vue 3</span>
    </footer>
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
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: #f3f4f6;
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
  gap: 1rem;
}

.app-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
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

.header-meta {
  display: flex;
  justify-content: flex-end;
}

.meta-pill {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  color: var(--muted);
}

.app-main {
  padding: 0 clamp(1rem, 4vw, 2rem) 1.5rem;
  flex: 1;
}

.app-footer {
  padding: 1rem clamp(1rem, 4vw, 2rem) 1.5rem;
  color: var(--muted);
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .app-header {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .nav {
    justify-content: flex-start;
  }

  .header-meta {
    justify-content: flex-start;
  }
}
</style>
