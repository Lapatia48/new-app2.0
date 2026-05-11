<script setup>
import { RouterLink } from 'vue-router'
import DataCard from '@/components/DataCard.vue'
</script>

<template>
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Data</p>
      <h1>Orchestrer les donnees PrestaShop en XML.</h1>
      <p class="lead">
        Un poste de commande pour importer des CSV et reinitialiser les jeux de donnees sans casser
        la boutique.
      </p>
      <div class="hero-actions">
        <RouterLink to="/data/import" class="primary-btn">Importer CSV</RouterLink>
        <RouterLink to="/data/reset" class="ghost-btn">Reinitialiser</RouterLink>
      </div>
    </div>
    <div class="hero-grid">
      <DataCard
        to="/data/import"
        tag="CSV"
        title="Import CSV"
        description="Charger des produits et des categories avec un mapping souple."
      />
      <DataCard
        to="/data/reset"
        tag="SAFE"
        title="Reinitialisation"
        description="Nettoyer les donnees sans truncate brutal, stock via PUT 0."
      />
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 2.5rem;
  align-items: start;
}

.hero-copy {
  background: var(--surface);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid var(--border);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.6rem;
}

.hero-copy h1 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
}

.lead {
  margin: 0 0 1.5rem;
  color: var(--muted);
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  font-weight: 600;
  border: 1px solid transparent;
}

.primary-btn {
  background: var(--accent);
  color: #ffffff;
}

.ghost-btn {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
}

.hero-grid {
  display: grid;
  gap: 1rem;
}
</style>
