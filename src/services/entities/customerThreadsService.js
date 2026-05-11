import { createCrud } from '@/services/entities/crud'

const crud = createCrud('customer_threads', 'customer_thread')

export const listCustomerThreadIds = crud.listIds
export const readCustomerThread = crud.read
export const createCustomerThread = crud.create
export const updateCustomerThread = crud.update
export const deleteCustomerThread = crud.remove
