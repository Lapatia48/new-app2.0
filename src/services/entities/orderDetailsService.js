import { createCrud } from '@/services/entities/crud'

const crud = createCrud('order_details', 'order_detail')

export const listOrderDetailIds = crud.listIds
export const readOrderDetail = crud.read
export const createOrderDetail = crud.create
export const updateOrderDetail = crud.update
export const deleteOrderDetail = crud.remove
