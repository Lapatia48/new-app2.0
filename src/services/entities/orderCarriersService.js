import { createCrud } from '@/services/entities/crud'

const crud = createCrud('order_carriers', 'order_carrier')

export const listOrderCarrierIds = crud.listIds
export const readOrderCarrier = crud.read
export const createOrderCarrier = crud.create
export const updateOrderCarrier = crud.update
export const deleteOrderCarrier = crud.remove
