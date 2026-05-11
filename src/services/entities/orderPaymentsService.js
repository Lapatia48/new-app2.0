import { createCrud } from '@/services/entities/crud'

const crud = createCrud('order_payments', 'order_payment')

export const listOrderPaymentIds = crud.listIds
export const readOrderPayment = crud.read
export const createOrderPayment = crud.create
export const updateOrderPayment = crud.update
export const deleteOrderPayment = crud.remove
