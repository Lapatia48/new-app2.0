<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/services/frontoffice/cartStore'

const router = useRouter()
const { items, total, updateItem, removeItem, clearCart } = useCartStore()

const hasItems = computed(() => items.value.length > 0)

function formatMoney(value) {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}

function goCheckout() {
  router.push('/frontoffice/checkout')
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Panier</h2>
        <p>Verification des articles.</p>
      </div>
      <div class="actions">
        <RouterLink to="/frontoffice/catalog" class="link">Continuer mes achats</RouterLink>
        <button type="button" class="ghost" :disabled="!hasItems" @click="clearCart">Vider</button>
      </div>
    </header>

    <p v-if="!hasItems" class="notice">Votre panier est vide.</p>

    <div v-else class="table-card">
      <table class="table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Prix</th>
            <th>Qte</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.key">
            <td>
              <div class="product">
                <img v-if="item.imageUrl" :src="item.imageUrl" alt="" />
                <div>
                  <div>{{ item.name }}</div>
                  <div class="muted">Ref: {{ item.reference }}</div>
                  <div v-if="item.specificite" class="muted">Specificite: {{ item.specificite }}</div>
                  <div v-if="item.karazany" class="muted">Karazany: {{ item.karazany }}</div>
                </div>
              </div>
            </td>
            <td>{{ formatMoney(item.price) }}</td>
            <td>
              <input
                type="number"
                min="1"
                :value="item.quantity"
                @change="updateItem(item.key, $event.target.value)"
              />
            </td>
            <td>{{ formatMoney(item.price * item.quantity) }}</td>
            <td>
              <button type="button" class="ghost" @click="removeItem(item.key)">Retirer</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="summary">
        <div>Total</div>
        <div class="total">{{ formatMoney(total) }}</div>
      </div>

      <div class="checkout">
        <button type="button" class="primary" :disabled="!hasItems" @click="goCheckout">
          Passer la commande
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  background: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.link,
button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

button.ghost {
  background: #fff;
}

button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.notice {
  padding: 0.6rem;
  border: 1px solid #eee;
  background: #fafafa;
}

.table-card {
  border: 1px solid #ddd;
  padding: 0.75rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.6rem;
  border-bottom: 1px solid #eee;
  text-align: left;
  vertical-align: top;
}

.product {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.product img {
  width: 46px;
  height: 46px;
  object-fit: cover;
  border: 1px solid #eee;
}

.muted {
  color: #666;
  font-size: 0.85rem;
}

input {
  width: 70px;
  padding: 0.3rem;
  border: 1px solid #ccc;
}

.summary {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 0;
  font-weight: 600;
}

.total {
  min-width: 100px;
  text-align: right;
}

.checkout {
  display: flex;
  justify-content: flex-end;
}
</style>
