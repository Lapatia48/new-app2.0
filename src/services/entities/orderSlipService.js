import { createCrud } from '@/services/entities/crud'

const crud = createCrud('order_slip', 'order_slip')

export const listOrderSlipIds = crud.listIds
export const readOrderSlip = crud.read
export const createOrderSlip = crud.create
export const updateOrderSlip = crud.update
export const deleteOrderSlip = crud.remove
