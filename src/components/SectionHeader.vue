<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
</script>

<template>
  <div class="section-header">
    <div class="section-text">
      <p v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</p>
      <h2 class="section-title">{{ title }}</h2>
      <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
    </div>
    <div class="section-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
}

.section-text {
  max-width: 44rem;
}

.section-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.4rem;
}

.section-title {
  margin: 0 0 0.4rem;
  font-size: 1.5rem;
}

.section-subtitle {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.section-actions {
  display: flex;
  gap: 0.75rem;
}
</style>
