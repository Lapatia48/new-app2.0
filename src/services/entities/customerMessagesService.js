import { createCrud } from '@/services/entities/crud'

const crud = createCrud('customer_messages', 'customer_message')

export const listCustomerMessageIds = crud.listIds
export const readCustomerMessage = crud.read
export const createCustomerMessage = crud.create
export const updateCustomerMessage = crud.update
export const deleteCustomerMessage = crud.remove
