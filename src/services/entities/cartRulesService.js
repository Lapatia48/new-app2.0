import { createCrud } from '@/services/entities/crud'

const crud = createCrud('cart_rules', 'cart_rule')

export const listCartRuleIds = crud.listIds
export const readCartRule = crud.read
export const createCartRule = crud.create
export const updateCartRule = crud.update
export const deleteCartRule = crud.remove
