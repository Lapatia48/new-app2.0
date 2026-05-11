import { createCrud } from '@/services/entities/crud'

const crud = createCrud('order_cart_rules', 'order_cart_rule')

export const listOrderCartRuleIds = crud.listIds
export const readOrderCartRule = crud.read
export const createOrderCartRule = crud.create
export const updateOrderCartRule = crud.update
export const deleteOrderCartRule = crud.remove
