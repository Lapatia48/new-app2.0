<script setup>
import { ref, onMounted } from 'vue'
import { getXml } from '@/services/http/prestashopClient'
import { parseXml, getText } from '@/services/xml/xmlUtils'
import { listCombinationsByProduct } from '@/services/entities/combinationsService'
import { afficherImageProduct } from '@/services/entities/imagesService'
import { updateProduct } from '@/services/entities/productsService'
import { updateCombination } from '@/services/entities/combinationsService'
import { createTax } from '@/services/entities/taxesService'
import { createTaxRulesGroup } from '@/services/entities/taxRulesGroupsService'
import { createTaxRule } from '@/services/entities/taxRulesService'

const productsData = ref([])
const loading = ref(true)
const error = ref(null)
const showModal = ref(false)
const modalData = ref(null)
const modalOriginal = ref(null)
const saving = ref(false)
const optionValueCache = new Map()
const optionGroupCache = new Map()

function pickLangText(node, selector) {
  return getText(node, `${selector} > language`) || getText(node, selector)
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function computeMargin(priceSelling, wholesalePrice, taxRate) {
  const taxAmount = wholesalePrice * (taxRate / 100)
  return priceSelling - (wholesalePrice + taxAmount)
}

async function fetchOptionGroup(groupId) {
  const id = Number.parseInt(String(groupId ?? ''), 10)
  if (!Number.isFinite(id) || !id) {
    return null
  }
  if (optionGroupCache.has(id)) {
    return optionGroupCache.get(id)
  }
  const xml = await getXml(`product_options/${id}`)
  const doc = parseXml(xml)
  const node = doc.querySelector('product_option')
  if (!node) {
    optionGroupCache.set(id, null)
    return null
  }
  const name = pickLangText(node, 'name') || `Groupe #${id}`
  const group = { id, name }
  optionGroupCache.set(id, group)
  return group
}

async function fetchOptionValue(valueId) {
  const id = Number.parseInt(String(valueId ?? ''), 10)
  if (!Number.isFinite(id) || !id) {
    return null
  }
  if (optionValueCache.has(id)) {
    return optionValueCache.get(id)
  }
  const xml = await getXml(`product_option_values/${id}`)
  const doc = parseXml(xml)
  const node = doc.querySelector('product_option_value')
  if (!node) {
    optionValueCache.set(id, null)
    return null
  }
  const name = pickLangText(node, 'name') || `Valeur #${id}`
  const groupId = Number.parseInt(getText(node, 'id_attribute_group') || '0', 10)
  const group = await fetchOptionGroup(groupId)
  const value = {
    id,
    name,
    groupId,
    groupName: group?.name || ''
  }
  optionValueCache.set(id, value)
  return value
}

async function fetchVariantsForProduct(productId) {
  const combinations = await listCombinationsByProduct(productId)
  const variants = await Promise.all(
    combinations.map(async (combination) => {
      const values = await Promise.all(
        (combination.optionValueIds || []).map((valueId) => fetchOptionValue(valueId))
      )
      const cleaned = values.filter(Boolean)
      if (!cleaned.length) {
        return null
      }
      return {
        id: combination.id,
        priceImpact: Number(combination.priceImpact) || 0,
        values: cleaned
      }
    })
  )
  return variants.filter(Boolean)
}

async function fetchProductsWithCombinations() {
  try {
    loading.value = true
    error.value = null

    // Récupérer tous les produits
    const productsXml = await getXml('products', {
      display: '[id,reference,name,price,wholesale_price,id_tax_rules_group]',
      limit: '0,1000'
    })

    const doc = parseXml(productsXml)
    const productNodes = Array.from(doc.querySelectorAll('product'))

    // Enrichir chaque produit avec ses combinaisons et taxes
    const enrichedProducts = await Promise.all(
      productNodes.map(async (node) => {
        const id = toNumber(node.getAttribute('id') || getText(node, 'id'))
        const name = pickLangText(node, 'name') || `Produit #${id}`
        const reference = getText(node, 'reference') || ''
        const price = toNumber(getText(node, 'price'), 0)
        const wholesalePrice = toNumber(getText(node, 'wholesale_price'), 0)
        const idTaxRulesGroup = toNumber(getText(node, 'id_tax_rules_group'), 0)

        let taxRate = 0
        let idTax = 0
        let taxName = ''

        try {
          // Récupérer les règles de taxe du produit
          if (idTaxRulesGroup > 0) {
            const taxRulesXml = await getXml('tax_rules', {
              display: '[id,id_tax,id_tax_rules_group]',
              limit: '0,100'
            })
            const taxRulesDoc = parseXml(taxRulesXml)
            const taxRuleNodes = Array.from(taxRulesDoc.querySelectorAll('tax_rule'))
            const matchingRule = taxRuleNodes.find(
              (ruleNode) => toNumber(getText(ruleNode, 'id_tax_rules_group')) === idTaxRulesGroup
            )
            
            if (matchingRule) {
              idTax = toNumber(getText(matchingRule, 'id_tax'), 0)
              if (idTax > 0) {
                const taxesXml = await getXml(`taxes/${idTax}`, {
                  display: '[id,rate,name]'
                })
                const taxDoc = parseXml(taxesXml)
                const rateText = getText(taxDoc.documentElement, 'rate')
                taxRate = toNumber(rateText, 0)
                taxName = getText(taxDoc.documentElement, 'name') || ''
              }
            }
          }
        } catch (err) {
          console.error(`Erreur taxes pour le produit ${id}:`, err)
        }

        // Récupérer les variantes avec leurs noms et valeurs
        let variants = []
        try {
          variants = await fetchVariantsForProduct(id)
        } catch (err) {
          console.error(`Erreur variantes pour le produit ${id}:`, err)
        }

        // Ajouter marge et image pour chaque variante
        const combinationsWithMargin = await Promise.all(
          variants.map(async (variant) => {
            const priceSelling = price + variant.priceImpact
            const margin = computeMargin(priceSelling, wholesalePrice, taxRate)
            const imageUrl = await afficherImageProduct(id)
            
            return {
              id: variant.id,
              values: variant.values,
              priceSelling,
              priceImpact: variant.priceImpact,
              wholesalePrice,
              taxRate,
              margin,
              imageUrl,
              productId: id
            }
          })
        )

        // Si pas de variante, ajouter le produit seul
        if (combinationsWithMargin.length === 0) {
          const margin = computeMargin(price, wholesalePrice, taxRate)
          const imageUrl = await afficherImageProduct(id)
          combinationsWithMargin.push({
            id: null,
            values: [],
            priceSelling: price,
            priceImpact: 0,
            wholesalePrice,
            taxRate,
            margin,
            imageUrl,
            productId: id
          })
        }

        return {
          id,
          name,
          reference,
          price,
          wholesalePrice,
          taxRate,
          idTax,
          taxName,
          idTaxRulesGroup,
          combinationsWithMargin
        }
      })
    )

    productsData.value = enrichedProducts
  } catch (err) {
    error.value = err.message
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openModal(product, combo) {
  modalData.value = {
    product: JSON.parse(JSON.stringify(product)),
    combo: JSON.parse(JSON.stringify(combo)),
    salePrice: combo?.priceSelling ?? product.price
  }
  modalOriginal.value = {
    product: JSON.parse(JSON.stringify(product)),
    combo: JSON.parse(JSON.stringify(combo)),
    salePrice: combo?.priceSelling ?? product.price
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  modalData.value = null
  modalOriginal.value = null
}

async function saveModal() {
  if (!modalData.value) return
  saving.value = true
  try {
    const { product, combo, salePrice } = modalData.value
    const { product: origProduct, combo: origCombo, salePrice: origSalePrice } = modalOriginal.value
    const resolvedSalePrice = toNumber(salePrice, combo.id ? origCombo.priceSelling : origProduct.price)
    let taxRulesGroupId = product.idTaxRulesGroup
    const baseProductPayload = {
      name: product.name,
      reference: product.reference ?? '',
      description: '',
      descriptionShort: '',
      availableDate: undefined,
      minimalQuantity: 1,
      categoryId: 2,
      active: true
    }

    const updateProductPrice = async (nextPrice) => {
      await updateProduct(product.id, {
        ...baseProductPayload,
        price: nextPrice,
        wholesalePrice: product.wholesalePrice,
        taxRulesGroupId
      })
    }

    const updateProductWholesale = async (nextWholesalePrice) => {
      await updateProduct(product.id, {
        ...baseProductPayload,
        price: product.price,
        wholesalePrice: nextWholesalePrice,
        taxRulesGroupId
      })
    }

    const updateProductTax = async () => {
      await updateProduct(product.id, {
        ...baseProductPayload,
        price: product.price,
        wholesalePrice: product.wholesalePrice,
        taxRulesGroupId
      })
    }

    // Taxe: créer un nouveau tax, tax_rules_group et tax_rule puis rattacher le produit
    if (product.taxRate !== origProduct.taxRate && product.idTax > 0) {
      const newTaxId = await createTax({ 
        rate: product.taxRate.toString(),
        name: `${product.taxName} (${product.taxRate}%)`
      })
      
      const newTaxRulesGroupId = await createTaxRulesGroup({
        name: `Groupe taxe ${product.taxRate}% pour produit ${product.id}`
      })
      
      await createTaxRule({
        taxRulesGroupId: newTaxRulesGroupId,
        taxId: newTaxId,
        countryId: 1,
        stateId: 0
      })
      taxRulesGroupId = newTaxRulesGroupId
      await updateProductTax()
    }

    // Prix d'achat: appel dédié
    if (product.wholesalePrice !== origProduct.wholesalePrice) {
      await updateProductWholesale(product.wholesalePrice)
    }

    // Prix de vente: appel dédié selon le type de ligne
    if (combo.id && resolvedSalePrice !== origSalePrice) {
      const newPriceImpact = resolvedSalePrice - product.price
      await updateCombination(combo.id, {
        id_product: product.id,
        minimal_quantity: 1,
        price: newPriceImpact.toFixed(2)
      })
    }

    if (!combo.id && resolvedSalePrice !== origSalePrice) {
      await updateProductPrice(resolvedSalePrice)
    }

    error.value = null
    closeModal()
    // Recharger les données
    await fetchProductsWithCombinations()
  } catch (err) {
    error.value = `Erreur lors de la mise à jour: ${err.message}`
    console.error(err)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchProductsWithCombinations()
})
</script>

<template>
  <section class="page">
    <h1>Analyse Marge Produits & Déclinaisons</h1>

    <div v-if="loading" class="loading">Chargement...</div>
    <div v-else-if="error" class="error">Erreur: {{ error }}</div>
    <div v-else>
      <div v-for="product in productsData" :key="product.id" class="product-section">
        <h2>{{ product.name }}</h2>
        <table class="combinations-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Spécificités</th>
              <th>Prix de vente</th>
              <th>Prix d'achat</th>
              <th>Taxe (%)</th>
              <th>Marge</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="combo in product.combinationsWithMargin" :key="combo.id || 'simple'">
              <td class="image-cell">
                <img v-if="combo.imageUrl" :src="combo.imageUrl" :alt="product.name" class="product-image" />
                <span v-else class="no-image">Pas d'image</span>
              </td>
              <td class="specifcities-cell">
                <div v-if="combo.values.length === 0" class="simple-product">Produit simple</div>
                <div v-else class="specificity-list">
                  <div v-for="value in combo.values" :key="`${value.groupId}-${value.id}`" class="specificity">
                    <span class="group-name">{{ value.groupName }}</span>
                    <span class="group-value">{{ value.name }}</span>
                  </div>
                </div>
              </td>
              <td>{{ combo.priceSelling.toFixed(2) }} €</td>
              <td>{{ combo.wholesalePrice.toFixed(2) }} €</td>
              <td>{{ combo.taxRate.toFixed(2) }}%</td>
              <td :class="{ positive: combo.margin >= 0, negative: combo.margin < 0 }">
                {{ combo.margin.toFixed(2) }} €
              </td>
              <td>
                <button class="btn btn-edit" @click="openModal(product, combo)">Modifier</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de modification -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier {{ modalData?.product.name }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <div v-if="error" class="error-modal">{{ error }}</div>

          <form @submit.prevent="saveModal">
            <div class="form-section">
              <h4>Produit</h4>
              <div class="form-group">
                <label>Prix de vente (€)</label>
                <input v-model.number="modalData.salePrice" type="number" step="0.01" />
              </div>
              <div class="form-group">
                <label>Prix d'achat (€)</label>
                <input v-model.number="modalData.product.wholesalePrice" type="number" step="0.01" />
              </div>
              <div class="form-group">
                <label>Taux de taxe (%)</label>
                <input v-model.number="modalData.product.taxRate" type="number" step="0.01" />
              </div>
            </div>

            <div v-if="modalData.combo.values.length > 0" class="form-section">
              <h4>Déclinaison</h4>
              <div class="specificity-display">
                <div v-for="value in modalData.combo.values" :key="`${value.groupId}-${value.id}`">
                  <strong>{{ value.groupName }}:</strong> {{ value.name }}
                </div>
              </div>
            </div>

            <div class="form-section calculation">
              <h4>Récapitulatif</h4>
              <div class="calc-row">
                <span>Prix de vente sélectionné:</span>
                <strong>{{ modalData.salePrice.toFixed(2) }} €</strong>
              </div>
              <div class="calc-row">
                <span>Taxe sur achat:</span>
                <strong>{{ (modalData.product.wholesalePrice * (modalData.product.taxRate / 100)).toFixed(2) }} €</strong>
              </div>
              <div class="calc-row total">
                <span>Marge estimée:</span>
                <strong
                  :class="{
                    positive: computeMargin(modalData.salePrice, modalData.product.wholesalePrice, modalData.product.taxRate) >= 0,
                    negative: computeMargin(modalData.salePrice, modalData.product.wholesalePrice, modalData.product.taxRate) < 0
                  }"
                >
                  {{ computeMargin(modalData.salePrice, modalData.product.wholesalePrice, modalData.product.taxRate).toFixed(2) }} €
                </strong>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-cancel" @click="closeModal">Annuler</button>
              <button type="submit" class="btn btn-save" :disabled="saving">
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
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

.loading,
.error {
  padding: 1rem;
  text-align: center;
}

.error {
  color: #d32f2f;
  background: #ffebee;
  border: 1px solid #d32f2f;
  border-radius: 4px;
}

.product-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #f0f0f0;
}

.product-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  color: #333;
}

.combinations-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.combinations-table th,
.combinations-table td {
  padding: 0.7rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.combinations-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.combinations-table tr:hover {
  background: #fafafa;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-edit {
  background: #2196F3;
  color: white;
}

.btn-edit:hover {
  background: #1976D2;
}

.image-cell {
  width: 80px;
  text-align: center;
}

.product-image {
  max-width: 80px;
  max-height: 80px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #ddd;
}

.no-image {
  color: #999;
  font-size: 0.8rem;
}

.specifcities-cell {
  min-width: 200px;
}

.simple-product {
  color: #999;
  font-style: italic;
}

.specificity-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.specificity {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.group-name {
  font-weight: 600;
  color: #666;
  min-width: 80px;
}

.group-value {
  color: #333;
}

.positive {
  color: #2e7d32;
  font-weight: 600;
}

.negative {
  color: #d32f2f;
  font-weight: 600;
}

.badge {
  padding: 0.3rem 0.6rem;
  border-radius: 3px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge-success {
  background: #c8e6c9;
  color: #1b5e20;
}

.badge-danger {
  background: #ffcdd2;
  color: #b71c1c;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.error-modal {
  background: #ffebee;
  color: #d32f2f;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border-left: 4px solid #d32f2f;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.7rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.specificity-display {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  line-height: 1.6;
}

.specificity-display div {
  color: #555;
}

.specificity-display strong {
  color: #333;
}

.calculation {
  background: #fafafa;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #2196F3;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  color: #666;
}

.calc-row strong {
  color: #333;
  font-weight: 600;
}

.calc-row.total {
  border-top: 1px solid #ddd;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
}

.calc-row.total strong.positive {
  color: #2e7d32;
}

.calc-row.total strong.negative {
  color: #d32f2f;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
  margin-top: 1.5rem;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #45a049;
}

.btn-save:disabled {
  background: #bbb;
  cursor: not-allowed;
}
</style>
