import { createCrud } from '@/services/entities/crud'

const crud = createCrud('order_invoices', 'order_invoice')

export const listOrderInvoiceIds = crud.listIds
export const readOrderInvoice = crud.read
export const createOrderInvoice = crud.create
export const updateOrderInvoice = crud.update
export const deleteOrderInvoice = crud.remove
