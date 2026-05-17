import { DEFAULT_CATEGORY_ID, ROOT_CATEGORY_ID } from '@/services/constants'
import { listStockAvailableIds, setStockQuantityById } from '@/services/entities/stockAvailablesService'
import { listStockMovementIds, deleteStockMovement } from '@/services/entities/stockMovementsService'
import { listStockIds, deleteStock } from '@/services/entities/stocksService'
import { listOrderInvoiceIds, deleteOrderInvoice } from '@/services/entities/orderInvoicesService'
import { listOrderSlipIds, deleteOrderSlip } from '@/services/entities/orderSlipService'
import { listOrderPaymentIds, deleteOrderPayment } from '@/services/entities/orderPaymentsService'
import { listOrderHistoryIds, deleteOrderHistory } from '@/services/entities/orderHistoriesService'
import { listOrderCarrierIds, deleteOrderCarrier } from '@/services/entities/orderCarriersService'
import { listOrderDetailIds, deleteOrderDetail } from '@/services/entities/orderDetailsService'
import { listOrderCartRuleIds, deleteOrderCartRule } from '@/services/entities/orderCartRulesService'
import { listOrderIds, deleteOrder } from '@/services/entities/ordersService'
import { listCartIds, deleteCart } from '@/services/entities/cartsService'
import { listCartRuleIds, deleteCartRule } from '@/services/entities/cartRulesService'
import { listCustomerMessageIds, deleteCustomerMessage } from '@/services/entities/customerMessagesService'
import { listCustomerThreadIds, deleteCustomerThread } from '@/services/entities/customerThreadsService'
import { listAddressIds, deleteAddress } from '@/services/entities/addressesService'
import { listCustomerIds, deleteCustomer } from '@/services/entities/customersService'
import { listSpecificPriceIds, deleteSpecificPrice } from '@/services/entities/specificPricesService'
import { listSpecificPriceRuleIds, deleteSpecificPriceRule } from '@/services/entities/specificPriceRulesService'
import { listCombinationIds, deleteCombination } from '@/services/entities/combinationsService'
import { listProductIds, deleteProduct } from '@/services/entities/productsService'
import { listCategoryIds, deleteCategory } from '@/services/entities/categoriesService'
import { listTaxIds, deleteTax } from '@/services/entities/taxesService'
import { listTaxRuleIds, deleteTaxRule } from '@/services/entities/taxRulesService'
import { listTaxRulesGroupIds, deleteTaxRulesGroup } from '@/services/entities/taxRulesGroupsService'

export async function resetData() {
  let totalActions = 0
  let failedActions = 0

  const stockIds = await listStockAvailableIds()
  for (const id of stockIds) {
    try {
      await setStockQuantityById(id, 0)
    } catch (error) {
      failedActions += 1
    }
    totalActions += 1
  }

  await runDelete(listStockMovementIds, deleteStockMovement)
  await runDelete(listStockIds, deleteStock)

  await runDelete(listOrderInvoiceIds, deleteOrderInvoice)
  await runDelete(listOrderSlipIds, deleteOrderSlip)
  await runDelete(listOrderPaymentIds, deleteOrderPayment)
  await runDelete(listOrderHistoryIds, deleteOrderHistory)
  await runDelete(listOrderCarrierIds, deleteOrderCarrier)
  await runDelete(listOrderDetailIds, deleteOrderDetail)
  await runDelete(listOrderCartRuleIds, deleteOrderCartRule)
  await runDelete(listOrderIds, deleteOrder)
  await runDelete(listCartIds, deleteCart)
  await runDelete(listCartRuleIds, deleteCartRule)
  await runDelete(listCustomerMessageIds, deleteCustomerMessage)
  await runDelete(listCustomerThreadIds, deleteCustomerThread)
  await runDelete(listAddressIds, deleteAddress)
  await runDelete(listCustomerIds, deleteCustomer)
  await runDelete(listSpecificPriceIds, deleteSpecificPrice)
  await runDelete(listSpecificPriceRuleIds, deleteSpecificPriceRule)
  await runDelete(listCombinationIds, deleteCombination)
  await runDelete(listProductIds, deleteProduct)
  await runDelete(listTaxRuleIds, deleteTaxRule)
  await runDelete(listTaxRulesGroupIds, deleteTaxRulesGroup)
  await runDelete(listTaxIds, deleteTax)

  const categoryIds = await listCategoryIds()
  const filtered = categoryIds.filter((id) => ![ROOT_CATEGORY_ID, DEFAULT_CATEGORY_ID].includes(id))
  totalActions += await deleteIds(filtered, deleteCategory, () => {
    failedActions += 1
  })

  return { totalActions, failedActions }

  async function runDelete(listFn, deleteFn) {
    const ids = await listFn()
    totalActions += await deleteIds(ids, deleteFn, () => {
      failedActions += 1
    })
  }
}

async function deleteIds(ids, deleteFn, onError) {
  let done = 0
  for (const id of ids) {
    try {
      await deleteFn(id)
    } catch (error) {
      onError()
    }
    done += 1
  }
  return done
}
