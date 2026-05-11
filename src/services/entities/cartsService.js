import { createCrud } from '@/services/entities/crud'

const crud = createCrud('carts', 'cart')

export const listCartIds = crud.listIds
export const readCart = crud.read
export const createCart = crud.create
export const updateCart = crud.update
export const deleteCart = crud.remove
