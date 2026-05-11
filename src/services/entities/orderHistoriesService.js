import { createCrud } from '@/services/entities/crud'

const crud = createCrud('order_histories', 'order_history')

export const listOrderHistoryIds = crud.listIds
export const readOrderHistory = crud.read
export const createOrderHistory = crud.create
export const updateOrderHistory = crud.update
export const deleteOrderHistory = crud.remove
