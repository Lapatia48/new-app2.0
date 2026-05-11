import { createCrud } from '@/services/entities/crud'

const crud = createCrud('specific_price_rules', 'specific_price_rule')

export const listSpecificPriceRuleIds = crud.listIds
export const readSpecificPriceRule = crud.read
export const createSpecificPriceRule = crud.create
export const updateSpecificPriceRule = crud.update
export const deleteSpecificPriceRule = crud.remove
