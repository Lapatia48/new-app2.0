<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' },
  canSubmit: { type: Boolean, default: false },
  success: { type: Boolean, default: false },
  orderId: { type: [Number, String], default: null }
})

defineEmits(['submit', 'back', 'go-orders'])

function formatMoney(value) {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}
</script>

<template>
  <div class="step">
    <p>Mode de paiement: paiement a la livraison.</p>

    <div class="summary">
      <div class="summary-row">
        <span>Articles</span>
        <span>{{ items.length }}</span>
      </div>
      <div class="summary-row">
        <span>Total</span>
        <span>{{ formatMoney(total) }}</span>
      </div>
    </div>

    <div v-if="success" class="notice success">
      Commande enregistree. ID: {{ orderId }}
      <button type="button" class="ghost" @click="$emit('go-orders')">Voir mes demandes</button>
    </div>

    <p v-if="error" class="notice error">{{ error }}</p>

    <div class="actions">
      <button type="button" class="ghost" @click="$emit('back')">Retour</button>
      <button type="button" class="primary" :disabled="!canSubmit || submitting" @click="$emit('submit')">
        {{ submitting ? 'Validation...' : 'Valider la commande' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.step {
  display: grid;
  gap: 0.75rem;
}

.summary {
  border: 1px solid #ddd;
  padding: 0.6rem;
  background: #fafafa;
  display: grid;
  gap: 0.3rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
}

.notice {
  padding: 0.6rem;
  border: 1px solid #eee;
  background: #fafafa;
}

.notice.success {
  border-color: #b6e2c3;
  background: #e9f7ee;
  color: #1f6b2f;
  display: grid;
  gap: 0.4rem;
}

.notice.error {
  border-color: #f5c2c2;
  background: #fdecec;
  color: #a62929;
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
