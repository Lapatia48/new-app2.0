<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { afficherImageProduct } from '@/services/entities/imagesService'
import { useCartStore } from '@/services/frontoffice/cartStore'
import { listProductVariants, buildSpecificiteOptions } from '@/services/frontoffice/productVariantsService'

const products = ref([])
const categories = ref([])
const loading = ref(false)
const categoriesLoading = ref(false)
const error = ref('')
const notice = ref('')
const selected = ref(null)
const filterSpecificite = ref('')
const filterName = ref('')
const filterCategory = ref('')
const filterPriceMin = ref('')
const filterPriceMax = ref('')

const { addItem } = useCartStore()

function pickLangText(node, selector) {
  return getText(node, `${selector} > language`) || getText(node, selector)
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function toNumberOrNull(value) {
  const raw = String(value ?? '').replace(',', '.').trim()
  if (!raw) {
    return null
  }
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function parseAvailableDate(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === '0000-00-00' || raw === '0000-00-00 00:00:00') {
    return null
  }
  const normalized = raw.includes('T')
    ? raw
    : raw.includes(' ')
      ? raw.replace(' ', 'T')
      : `${raw}T00:00:00`
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getBadge(product) {
  const date = parseAvailableDate(product.availableDate)
  if (!date) {
    return null
  }
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) {
    return null
  }
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) {
    return 'HOT'
  }
  else if (diffDays <= 7) {
    return 'NEW'
  }
  return null
}

function badgeClass(label) {
  return label === 'HOT' ? 'hot' : 'new'
}

function formatMoney(value) {
  return toNumber(value, 0).toFixed(2)
}

function getSelectedGroup(product) {
  if (!product?.specificites?.length) {
    return null
  }
  const current = product.specificites.find((group) => group.id === product.selectedGroupId)
  return current || product.specificites[0]
}

function getSelectedValue(product, group = getSelectedGroup(product)) {
  if (!group) {
    return null
  }
  const current = group.values.find((value) => value.id === product.selectedValueId)
  return current || group.values[0]
}

function getDisplayPrice(product) {
  const selectedValue = getSelectedValue(product)
  return product.price + (selectedValue?.priceImpact || 0)
}

function handleGroupChange(product, groupId) {
  const id = Number.parseInt(String(groupId), 10)
  product.selectedGroupId = Number.isFinite(id) ? id : null
  const group = getSelectedGroup(product)
  product.selectedValueId = group?.values?.[0]?.id ?? null
}

function handleValueChange(product, valueId) {
  const id = Number.parseInt(String(valueId), 10)
  product.selectedValueId = Number.isFinite(id) ? id : null
}

const availableSpecificites = computed(() => {
  const map = new Map()
  products.value.forEach((product) => {
    ;(product.specificites || []).forEach((group) => {
      if (!map.has(group.id)) {
        map.set(group.id, group)
      }
    })
  })
  return Array.from(map.values())
})

const categoryMap = computed(() => {
  const map = new Map()
  categories.value.forEach((category) => {
    if (category?.id) {
      map.set(String(category.id), category.name || '')
    }
  })
  return map
})

function getCategoryName(product) {
  if (!product?.categoryId) {
    return ''
  }
  return categoryMap.value.get(String(product.categoryId)) || ''
}

const filteredProducts = computed(() => {
  const nameQuery = filterName.value.trim().toLowerCase()
  const categoryId = String(filterCategory.value || '').trim()
  const minPrice = toNumberOrNull(filterPriceMin.value)
  const maxPrice = toNumberOrNull(filterPriceMax.value)

  return products.value.filter((product) => {
    if (nameQuery && !String(product.name || '').toLowerCase().includes(nameQuery)) {
      return false
    }
    if (categoryId && String(product.categoryId || '') !== categoryId) {
      return false
    }
    if (minPrice !== null && product.price < minPrice) {
      return false
    }
    if (maxPrice !== null && product.price > maxPrice) {
      return false
    }
    if (filterSpecificite.value) {
      return (product.specificites || []).some(
        (group) => String(group.id) === String(filterSpecificite.value)
      )
    }
    return true
  })
})

watch(filterSpecificite, (value) => {
  if (!value) {
    return
  }
  products.value.forEach((product) => {
    const group = (product.specificites || []).find(
      (item) => String(item.id) === String(value)
    )
    if (group) {
      product.selectedGroupId = group.id
      product.selectedValueId = group.values?.[0]?.id ?? null
    }
  })
})

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    const xml = await getXml('products', {
      display: '[id,reference,price,name,description_short,id_category_default,available_date]',
      limit: '0,1000'
    })
    const doc = parseXml(xml)
    const nodes = Array.from(doc.querySelectorAll('product'))
    const base = nodes
      .map((node) => {
        const id = Number.parseInt(node.getAttribute('id') || getText(node, 'id'), 10)
        if (!Number.isFinite(id)) {
          return null
        }
        const name = pickLangText(node, 'name') || `Produit #${id}`
        const description = pickLangText(node, 'description_short')
        const reference = getText(node, 'reference')
        const price = toNumber(getText(node, 'price'), 0)
        const categoryId = toNumber(getText(node, 'id_category_default'), null)
        const availableDate = getText(node, 'available_date')
        return { id, name, description, reference, price, categoryId, availableDate, imageUrl: null }
      })
      .filter(Boolean)

    const withImages = await Promise.all(
      base.map(async (item) => {
        const imageUrl = await afficherImageProduct(item.id)
        const variants = await listProductVariants(item.id)
        const specificites = buildSpecificiteOptions(variants)
        const defaultGroup = specificites[0] || null
        const defaultValue = defaultGroup?.values?.[0] || null
        return {
          ...item,
          imageUrl,
          variants,
          specificites,
          selectedGroupId: defaultGroup?.id ?? null,
          selectedValueId: defaultValue?.id ?? null
        }
      })
    )

    products.value = withImages
  } catch (err) {
    error.value = err?.message || 'Erreur chargement produits.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  categoriesLoading.value = true
  try {
    const xml = await getXml('categories', {
      display: '[id,name]',
      limit: '0,1000'
    })
    const doc = parseXml(xml)
    const nodes = Array.from(doc.querySelectorAll('category'))
    categories.value = nodes
      .map((node) => {
        const id = toNumber(node.getAttribute('id') || getText(node, 'id'), null)
        if (!id) {
          return null
        }
        const name = pickLangText(node, 'name') || `Categorie #${id}`
        return { id, name }
      })
      .filter(Boolean)
  } catch {
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

function addToCart(product) {
  if (!product.reference) {
    notice.value = 'Reference manquante, ajout impossible.'
    return
  }
  const group = getSelectedGroup(product)
  const value = getSelectedValue(product, group)
  if (product.specificites?.length && !value) {
    notice.value = 'Selectionnez une declinaison.'
    return
  }
  const price = product.price + (value?.priceImpact || 0)

  addItem({
    reference: product.reference,
    name: product.name,
    price,
    imageUrl: product.imageUrl,
    specificite: group?.name || null,
    karazany: value?.name || null,
    combinationId: value?.combinationId || null,
    specificiteId: group?.id || null,
    valueId: value?.id || null
  })
  notice.value = `${product.name} ajoute au panier.`
}

function toggleDetails(product) {
  if (selected.value?.id === product.id) {
    selected.value = null
    return
  }
  selected.value = product
}

function closeDetails() {
  selected.value = null
}

onMounted(() => {
  loadProducts()
  loadCategories()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Catalogue</h2>
        <p>Catalogue des produits disponibles.</p>
      </div>
      <div class="actions">
        <RouterLink to="/frontoffice/cart" class="link">Voir le panier</RouterLink>
      </div>
    </header>

    <div class="filters">
      <label class="filter">
        Nom
        <input v-model="filterName" type="search" placeholder="Nom du produit" />
      </label>
      <label class="filter">
        Categorie
        <select v-model="filterCategory" :disabled="categoriesLoading">
          <option value="">Toutes</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>
      <label class="filter">
        Prix min
        <input v-model="filterPriceMin" type="number" min="0" step="0.01" />
      </label>
      <label class="filter">
        Prix max
        <input v-model="filterPriceMax" type="number" min="0" step="0.01" />
      </label>
      <label class="filter">
        Specificite
        <select v-model="filterSpecificite">
          <option value="">Toutes</option>
          <option v-for="group in availableSpecificites" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="notice" class="notice">{{ notice }}</p>
    <p v-if="error" class="notice error">{{ error }}</p>
    <p v-else-if="loading" class="notice">Chargement...</p>
    <p v-else-if="!filteredProducts.length" class="notice">Aucun produit.</p>

    <div v-else class="grid">
      <article v-for="product in filteredProducts" :key="product.id" class="card">
        <div class="thumb">
          <img v-if="product.imageUrl" :src="product.imageUrl" alt="" />
          <span v-else>{{ product.name.slice(0, 1) }}</span>
        </div>
        <div class="info">
          <div class="meta">
            <span v-if="getBadge(product)" class="badge" :class="badgeClass(getBadge(product))">
              {{ getBadge(product) }}
            </span>
            <span v-if="getCategoryName(product)" class="pill">
              {{ getCategoryName(product) }}
            </span>
          </div>
          <h3>{{ product.name }}</h3>
          <p class="muted">Ref: {{ product.reference || '-' }}</p>
          <p v-if="getCategoryName(product)" class="muted">Categorie: {{ getCategoryName(product) }}</p>
          <p class="price">{{ formatMoney(getDisplayPrice(product)) }}</p>

          <div v-if="product.specificites?.length" class="variant">
            <label>
              Specificite
              <select
                :value="getSelectedGroup(product)?.id"
                @change="handleGroupChange(product, $event.target.value)"
              >
                <option v-for="group in product.specificites" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
            </label>
            <label>
              Karazany
              <select
                :value="getSelectedValue(product)?.id"
                @change="handleValueChange(product, $event.target.value)"
              >
                <option
                  v-for="value in getSelectedGroup(product)?.values || []"
                  :key="value.id"
                  :value="value.id"
                >
                  {{ value.name }} - {{ formatMoney(product.price + value.priceImpact) }}
                </option>
              </select>
            </label>
          </div>

          <div class="buttons">
            <button type="button" :disabled="!product.reference" @click="addToCart(product)">
              Ajouter au panier
            </button>
            <button type="button" class="ghost" @click="toggleDetails(product)">
              Fiche produit
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="selected" class="modal" @click.self="closeDetails">
      <div class="panel">
        <header class="panel-header">
          <div>
            <h3>{{ selected.name }}</h3>
            <p class="muted">Ref: {{ selected.reference || '-' }}</p>
            <div class="meta">
              <span v-if="getBadge(selected)" class="badge" :class="badgeClass(getBadge(selected))">
                {{ getBadge(selected) }}
              </span>
              <span v-if="getCategoryName(selected)" class="pill">
                {{ getCategoryName(selected) }}
              </span>
            </div>
          </div>
          <button type="button" class="ghost" @click="closeDetails">Fermer</button>
        </header>

        <div class="detail-grid">
          <div class="detail-media">
            <img v-if="selected.imageUrl" :src="selected.imageUrl" alt="" />
            <div v-else class="thumb-placeholder">{{ selected.name.slice(0, 1) }}</div>
          </div>
          <div class="detail-info">
            <p>{{ selected.description || 'Description non disponible.' }}</p>
            <p class="price">Prix: {{ formatMoney(getDisplayPrice(selected)) }}</p>

            <div v-if="selected.specificites?.length" class="variant">
              <label>
                Specificite
                <select
                  :value="getSelectedGroup(selected)?.id"
                  @change="handleGroupChange(selected, $event.target.value)"
                >
                  <option v-for="group in selected.specificites" :key="group.id" :value="group.id">
                    {{ group.name }}
                  </option>
                </select>
              </label>
              <label>
                Karazany
                <select
                  :value="getSelectedValue(selected)?.id"
                  @change="handleValueChange(selected, $event.target.value)"
                >
                  <option
                    v-for="value in getSelectedGroup(selected)?.values || []"
                    :key="value.id"
                    :value="value.id"
                  >
                    {{ value.name }} - {{ formatMoney(selected.price + value.priceImpact) }}
                  </option>
                </select>
              </label>
            </div>

            <button type="button" class="primary" @click="addToCart(selected)">Ajouter au panier</button>
          </div>
        </div>

        <div v-if="selected.specificites?.length" class="detail-variants">
          <h4>Declinaisons</h4>
          <div class="variant-list">
            <div v-for="group in selected.specificites" :key="group.id" class="variant-group">
              <p class="label">{{ group.name }}</p>
              <ul>
                <li v-for="value in group.values" :key="value.id">
                  {{ value.name }} - {{ formatMoney(selected.price + value.priceImpact) }}
                </li>
              </ul>
            </div>
          </div>
        </div>
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
}

.filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.filter {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.filter select {
  padding: 0.4rem;
  border: 1px solid #ccc;
}

.filter input {
  padding: 0.4rem;
  border: 1px solid #ccc;
}

.link {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  color: inherit;
  text-decoration: none;
}

.notice {
  padding: 0.6rem;
  border: 1px solid #eee;
  background: #fafafa;
  margin-bottom: 0.75rem;
}

.notice.error {
  border-color: #f5c2c2;
  background: #fdecec;
  color: #a62929;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.card {
  border: 1px solid #ddd;
  padding: 0.75rem;
  display: grid;
  gap: 0.75rem;
}

.thumb {
  height: 140px;
  border: 1px solid #eee;
  display: grid;
  place-items: center;
  background: #fafafa;
}

.thumb img {
  max-width: 100%;
  max-height: 100%;
}

.info h3 {
  margin: 0;
  font-size: 1rem;
}

.meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
}

.badge {
  display: inline-flex;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge.hot {
  background: #fde2e2;
  color: #b91c1c;
}

.badge.new {
  background: #e0f2fe;
  color: #0369a1;
}

.pill {
  display: inline-flex;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.7rem;
}

.muted {
  color: #666;
  font-size: 0.85rem;
  margin: 0.25rem 0;
}

.price {
  font-weight: 600;
}

.variant {
  display: grid;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.variant label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.variant select {
  padding: 0.4rem;
  border: 1px solid #ccc;
}

.buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f3f3f3;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.ghost {
  background: #fff;
}

button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.panel {
  background: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
  width: min(920px, 100%);
  max-height: 85vh;
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.detail-media {
  border: 1px solid #eee;
  background: #fafafa;
  display: grid;
  place-items: center;
  padding: 0.5rem;
}

.detail-media img {
  max-width: 100%;
  max-height: 220px;
}

.thumb-placeholder {
  width: 100%;
  height: 180px;
  display: grid;
  place-items: center;
  font-size: 2rem;
  color: #888;
}

.detail-info {
  display: grid;
  gap: 0.5rem;
}

.detail-variants {
  border-top: 1px solid #eee;
  padding-top: 0.75rem;
}

.variant-list {
  display: grid;
  gap: 0.75rem;
}

.variant-group ul {
  margin: 0.3rem 0 0;
  padding-left: 1.2rem;
}

.label {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
}

@media (max-width: 720px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
