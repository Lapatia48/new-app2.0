import { createCrud } from '@/services/entities/crud'

const crud = createCrud('specific_prices', 'specific_price')

export const listSpecificPriceIds = crud.listIds
export const readSpecificPrice = crud.read
export const createSpecificPrice = crud.create
export const updateSpecificPrice = crud.update
export const deleteSpecificPrice = crud.remove
