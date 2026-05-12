<script setup>
defineEmits(['next', 'back'])
</script>

<template>
  <div class="step">
    <p>Livraison: recuperation sur place.</p>
    <p>Frais de livraison: 0.00</p>
    <div class="actions">
      <button type="button" class="ghost" @click="$emit('back')">Retour</button>
      <button type="button" class="primary" @click="$emit('next')">Continuer</button>
    </div>
  </div>
</template>

<style scoped>
.step {
  display: grid;
  gap: 0.75rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  cursor: pointer;
}

button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

button.ghost {
  background: #fff;
}
</style>
