import { createCrud } from '@/services/entities/crud'

const crud = createCrud('customers', 'customer')

export const listCustomerIds = crud.listIds
export const readCustomer = crud.read
export const createCustomer = crud.create
export const updateCustomer = crud.update
export const deleteCustomer = crud.remove
