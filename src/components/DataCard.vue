<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  to: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  tag: { type: String, default: '' }
})
</script>

<template>
  <RouterLink :to="to" class="data-card">
    <div v-if="tag" class="data-card__tag">{{ tag }}</div>
    <h3 class="data-card__title">{{ title }}</h3>
    <p class="data-card__desc">{{ description }}</p>
    <div class="data-card__cta">
      <span>Ouvrir</span>
      <span class="arrow">-></span>
    </div>
  </RouterLink>
</template>

<style scoped>
.data-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.data-card:hover {
  border-color: #cbd5e1;
}

.data-card__tag {
  font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #1d4ed8;
  background: #e8efff;
  align-self: flex-start;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.data-card__title {
  margin: 0;
  font-size: 1.2rem;
}

.data-card__desc {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.data-card__cta {
  margin-top: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: #1f2937;
}
</style>
