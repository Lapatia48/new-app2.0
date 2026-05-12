<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'next', 'back'])

const error = ref('')

const address = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  () => {
    error.value = ''
  }
)

function submit() {
  if (!address.value.trim()) {
    error.value = 'Adresse requise.'
    return
  }
  emit('next')
}
</script>

<template>
  <div class="step">
    <p>Entrez votre adresse de livraison.</p>
    <label>
      Adresse
      <textarea v-model="address" rows="3" />
    </label>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="actions">
      <button type="button" class="ghost" @click="$emit('back')">Retour</button>
      <button type="button" class="primary" @click="submit">Continuer</button>
    </div>
  </div>
</template>

<style scoped>
.step {
  display: grid;
  gap: 0.75rem;
}

label {
  display: grid;
  gap: 0.3rem;
}

textarea {
  padding: 0.4rem;
  border: 1px solid #ccc;
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

.error {
  color: #b91c1c;
  margin: 0;
}
</style>
