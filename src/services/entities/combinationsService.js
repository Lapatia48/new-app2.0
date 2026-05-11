import { createCrud } from '@/services/entities/crud'

const crud = createCrud('combinations', 'combination')

export const listCombinationIds = crud.listIds
export const readCombination = crud.read
export const createCombination = crud.create
export const updateCombination = crud.update
export const deleteCombination = crud.remove
