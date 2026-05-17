import { parseCsvFile } from '@/services/import/csvParser'
import { runImport } from '@/services/import/importService'

const CSV_FILES = {
  products: 'produit.csv',
  stocks: 'stock.csv',
  orders: 'commande.csv'
}

export async function runImportOneShot({ files = [] } = {}) {
  const list = Array.from(files || [])
  if (!list.length) {
    throw new Error('Aucun dossier selectionne.')
  }

  const productsFile = findRootFile(list, CSV_FILES.products)
  if (!productsFile) {
    throw new Error('Fichier produit.csv introuvable.')
  }

  const stocksFile = findRootFile(list, CSV_FILES.stocks)
  if (!stocksFile) {
    throw new Error('Fichier stock.csv introuvable.')
  }

  const ordersFile = findRootFile(list, CSV_FILES.orders)
  if (!ordersFile) {
    throw new Error('Fichier commande.csv introuvable.')
  }

  const imageFiles = list.filter((file) => isImageFile(file))
  if (!imageFiles.length) {
    throw new Error('Aucune image trouvee dans images/.')
  }

  const productsParsed = await parseCsvFile(productsFile)
  const stocksParsed = await parseCsvFile(stocksFile)
  const ordersParsed = await parseCsvFile(ordersFile)

  const products = await runImport({
    target: 'products',
    rows: productsParsed.rows,
    meta: productsParsed
  })
  const stocks = await runImport({
    target: 'stocks',
    rows: stocksParsed.rows,
    meta: stocksParsed
  })
  const orders = await runImport({
    target: 'orders',
    rows: ordersParsed.rows,
    meta: ordersParsed
  })
  const images = await runImport({ target: 'images', files: imageFiles })

  return { products, stocks, orders, images }
}

function findRootFile(files, filename) {
  const target = filename.toLowerCase()
  return files.find((file) => {
    const relative = getRelativePath(file)
    const parts = relative.split('/')
    const base = parts[parts.length - 1].toLowerCase()
    return base === target && parts.length <= 2
  })
}

function isImageFile(file) {
  const relative = getRelativePath(file).toLowerCase()
  const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  const ext = getFileExtension(relative)
  const looksLikeImage = mimeType.startsWith('images/') || IMAGE_EXTENSIONS.has(ext)
  if (!looksLikeImage) {
    return false
  }

  if (!relative) {
    return true
  }

  const segments = relative.split('/').filter(Boolean)
  return segments.includes('images') || looksLikeImage
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'gif',
  'webp',
  'bmp',
  'tif',
  'tiff',
  'svg',
  'ico',
  'avif',
  'heic',
  'heif',
  'img'
])

function getFileExtension(path) {
  const lastSlash = path.lastIndexOf('/')
  const filename = lastSlash === -1 ? path : path.slice(lastSlash + 1)
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) {
    return ''
  }
  return filename.slice(lastDot + 1).trim().toLowerCase()
}

function getRelativePath(file) {
  const raw = file.webkitRelativePath || file.name || ''
  return raw.replace(/\\/g, '/')
}
