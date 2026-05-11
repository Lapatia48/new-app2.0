import { createCrud } from '@/services/entities/crud'

const crud = createCrud('orders', 'order')

export const listOrderIds = crud.listIds
export const readOrder = crud.read
export const createOrder = crud.create
export const updateOrder = crud.update
export const deleteOrder = crud.remove
