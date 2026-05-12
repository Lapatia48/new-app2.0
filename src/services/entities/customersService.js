import { createCrud } from '@/services/entities/crud'
import { getXml } from '@/services/http/prestashopClient'
import { extractIdsByTag, parseXml } from '@/services/xml/xmlUtils'

const crud = createCrud('customers', 'customer')

export const listCustomerIds = crud.listIds
export const readCustomer = crud.read
export const createCustomer = crud.create
export const updateCustomer = crud.update
export const deleteCustomer = crud.remove

export async function findCustomerIdByEmail(email) {
	if (!email) {
		return null
	}
	const xml = await getXml('customers', {
		display: '[id]',
		'filter[email]': email
	})
	const doc = parseXml(xml)
	const ids = extractIdsByTag(doc, 'customer')
		.map((value) => Number.parseInt(value, 10))
		.filter((value) => Number.isFinite(value))
	return ids[0] ?? null
}
