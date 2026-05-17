<script setup>
import { ref, computed, onMounted } from 'vue'
import { listProducts } from '@/services/entities/productsService'
import { addStockByReference } from '@/services/stock/stockAdjustmentService'
import { recordStockMovement } from '@/services/stock/stockHistoryService'

const products = ref([])
const productsError = ref('')
const isLoadingProducts = ref(false)
const selectedProductId = ref('')

const specificite = ref('')
const karazany = ref('')
const quantity = ref(1)
const status = ref('')
const statusType = ref('')
const isRunning = ref(false)
const lastResult = ref(null)

const selectedProduct = computed(() =>
  products.value.find((product) => String(product.id) === String(selectedProductId.value)) || null
)

const hasSelection = computed(() => Boolean(selectedProduct.value?.id))
function formatQty(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value)
}

function formatDelta(value) {
  const numeric = Number(value) || 0
  return numeric >= 0 ? `+${numeric}` : `${numeric}`
}

async function addStock() {
  status.value = ''
  statusType.value = ''

  if (!hasSelection.value) {
    statusType.value = 'error'
    status.value = 'Selectionnez un produit.'
    return
  }

  isRunning.value = true
  try {
    const result = await addStockByReference({
      productId: selectedProduct.value.id,
      reference: selectedProduct.value.reference,
      quantity: quantity.value,
      specificite: specificite.value,
      karazany: karazany.value
    })

    try {
      await recordStockMovement({
        productId: result.product.id,
        productAttributeId: result.productAttributeId,
        delta: result.quantity,
        priceTe: result.product.price
      })
    } catch (movementError) {
      const message = movementError?.message || 'Mouvement stock non enregistre.'
      throw new Error(`Stock mis a jour mais mouvement non enregistre: ${message}`)
    }

    lastResult.value = result
    statusType.value = 'success'
    status.value = `Stock mis a jour: ${result.previousQty} -> ${result.nextQty}`
  } catch (error) {
    statusType.value = 'error'
    status.value = error?.message || 'Erreur lors de la mise a jour du stock.'
  } finally {
    isRunning.value = false
  }
}

async function loadProducts() {
  isLoadingProducts.value = true
  productsError.value = ''
  try {
    products.value = await listProducts(300)
  } catch (error) {
    productsError.value = error?.message || 'Erreur lors du chargement des produits.'
  } finally {
    isLoadingProducts.value = false
  }
}

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Backoffice</p>
        <h1>Ajout en stock</h1>
        <p class="subtitle">Ajoute du stock et enregistre le mouvement dans Prestashop.</p>
      </div>
      <div class="header-actions">
        <RouterLink class="ghost" to="/backoffice/stocks/history">Voir historique</RouterLink>
      </div>
    </header>

    <div class="content">
      <div class="form-card">
        <div class="form-grid">
          <label class="field">
            Produit
            <select v-model="selectedProductId" :disabled="isLoadingProducts">
              <option value="">Selectionner un produit</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.reference ? `${product.reference} - ${product.name}` : product.name }}
              </option>
            </select>
          </label>
          <label class="field">
            Quantite a ajouter
            <input v-model.number="quantity" type="number" min="1" step="1" />
          </label>
          <label class="field">
            Specificite (optionnel)
            <input v-model="specificite" type="text" placeholder="Couleur" />
          </label>
          <label class="field">
            Karazany (optionnel)
            <input v-model="karazany" type="text" placeholder="Bleu" />
          </label>
        </div>
        <div class="actions">
          <button type="button" class="primary" :disabled="isRunning || !hasSelection" @click="addStock">
            {{ isRunning ? 'Mise a jour...' : 'Ajouter en stock' }}
          </button>
        </div>
        <p v-if="productsError" class="status error">{{ productsError }}</p>
        <p v-if="status" :class="['status', statusType]">{{ status }}</p>
      </div>

      <div v-if="lastResult" class="summary-card">
        <h2>Derniere mise a jour</h2>
        <div class="summary-grid">
          <div>
            <p class="label">Produit</p>
            <p class="value">{{ lastResult.product.name || selectedProduct?.name || '-' }}</p>
          </div>
          <div>
            <p class="label">Variation</p>
            <p class="value mono">{{ formatDelta(lastResult.quantity) }}</p>
          </div>
          <div>
            <p class="label">Stock final</p>
            <p class="value mono">{{ formatQty(lastResult.nextQty) }}</p>
          </div>
          <div>
            <p class="label">Variante</p>
            <p class="value">
              {{ lastResult.specificite ? `${lastResult.specificite} / ${lastResult.karazany}` : 'Produit simple' }}
            </p>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.page {
  --ink: #0d1b1e;
  --muted: #5f6b6d;
  --accent: #1f8a70;
  --accent-soft: #e3f6f1;
  --line: #e2ddd4;
  --card: #ffffff;
  font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  color: var(--ink);
  background:
    radial-gradient(circle at top right, #f9f2e5 0%, #f3efe7 45%, #eef6f4 100%);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 18px 40px rgba(16, 24, 32, 0.08);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0 0 0.4rem;
}

.subtitle {
  margin: 0;
  color: var(--muted);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-card,
.summary-card,
.table-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.field input {
  border-radius: 8px;
  border: 1px solid var(--line);
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  background: #fff;
}

.field select {
  border-radius: 8px;
  border: 1px solid var(--line);
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  background: #fff;
}

.actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.primary {
  padding: 0.6rem 1.3rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(120deg, #1f8a70, #0b6b6f);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(31, 138, 112, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(31, 138, 112, 0.35);
}

.ghost {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  padding: 0.55rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
}

.status {
  margin: 0.9rem 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}

.status.error {
  color: #b91c1c;
}

.status.success {
  color: #166534;
}

.summary-card h2 {
  margin: 0 0 0.85rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
  margin: 0 0 0.35rem;
}

.value {
  margin: 0;
  font-size: 1.05rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.muted {
  color: var(--muted);
  margin: 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}

.table thead {
  background: #f5f2ea;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.table th,
.table td {
  padding: 0.8rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.empty {
  padding: 1rem;
  border: 1px dashed var(--line);
  border-radius: 12px;
  color: var(--muted);
  background: #fbfaf7;
}

.mono {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
  }

  .table {
    min-width: 520px;
  }
}
</style>
