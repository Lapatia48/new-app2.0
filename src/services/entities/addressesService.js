import { createCrud } from '@/services/entities/crud'

const crud = createCrud('addresses', 'address')

export const listAddressIds = crud.listIds
export const readAddress = crud.read
export const createAddress = crud.create
export const updateAddress = crud.update
export const deleteAddress = crud.remove
