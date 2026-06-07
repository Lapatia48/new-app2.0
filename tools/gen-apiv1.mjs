// ============================================================================
// gen-apiv1.mjs
// ----------------------------------------------------------------------------
// Genere le fichier "apiv1.json" : une documentation OpenAPI 3.0 (Swagger) de
// l'API REST GLPI v1 (apirest.php), limitee aux endpoints utilises par l'app.
//
// GLPI ne fournit pas de commande pour exporter ce swagger v1 (seule l'API
// "v2" haut-niveau a un OpenAPI natif). Ce petit script le construit donc a la
// main, de facon reproductible.
//
// Utilisation (en ligne de commande, depuis la racine du projet) :
//   node tools/gen-apiv1.mjs
// ============================================================================

import { writeFileSync } from 'node:fs'

// Les itemtypes manipules par l'application (CRUD standard).
const ITEMTYPES = [
  'Computer',
  'Monitor',
  'Ticket',
  'TicketCost',
  'Item_Ticket',
  'Document_Item',
  'State',
  'Location',
  'Manufacturer',
  'ComputerModel',
  'MonitorModel'
]

// En-tetes communs (Session-Token + App-Token) reutilises partout.
const commonHeaders = [
  { name: 'Session-Token', in: 'header', required: true, schema: { type: 'string' }, description: 'Jeton de session fourni par initSession.' },
  { name: 'App-Token', in: 'header', required: false, schema: { type: 'string' }, description: 'Jeton d\'application (optionnel).' }
]

// Construit les chemins CRUD standards pour un itemtype.
function crudPaths(itemtype) {
  return {
    ['/' + itemtype]: {
      get: {
        tags: [itemtype],
        summary: 'Lister les ' + itemtype,
        parameters: [
          ...commonHeaders,
          { name: 'range', in: 'query', schema: { type: 'string', example: '0-9999' }, description: 'Pagination debut-fin.' },
          { name: 'expand_dropdowns', in: 'query', schema: { type: 'boolean' }, description: 'Afficher le nom des dropdowns au lieu de l\'id.' },
          { name: 'searchText[name]', in: 'query', schema: { type: 'string' }, description: 'Filtre "contient" sur le nom.' }
        ],
        responses: {
          200: { description: 'Liste des elements.' },
          206: { description: 'Liste partielle (selon range).' },
          401: { description: 'Non autorise.' }
        }
      },
      post: {
        tags: [itemtype],
        summary: 'Creer un ' + itemtype,
        parameters: commonHeaders,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { input: { type: 'object', description: 'Champs de l\'itemtype.' } },
                required: ['input']
              }
            }
          }
        },
        responses: {
          201: { description: 'Cree. Renvoie { id }.' },
          207: { description: 'Creation multiple avec statut par element.' },
          400: { description: 'Erreur d\'entree.' }
        }
      }
    },
    ['/' + itemtype + '/{id}']: {
      get: {
        tags: [itemtype],
        summary: 'Lire un ' + itemtype,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          ...commonHeaders
        ],
        responses: { 200: { description: 'Element.' }, 401: { description: 'Non autorise.' } }
      },
      put: {
        tags: [itemtype],
        summary: 'Modifier un ' + itemtype,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          ...commonHeaders
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { input: { type: 'object' } }, required: ['input'] }
            }
          }
        },
        responses: { 200: { description: 'Mis a jour.' } }
      },
      delete: {
        tags: [itemtype],
        summary: 'Supprimer un ' + itemtype,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'force_purge', in: 'query', schema: { type: 'boolean' }, description: 'Suppression definitive (pas de corbeille).' },
          ...commonHeaders
        ],
        responses: { 200: { description: 'Supprime (multiple).' }, 204: { description: 'Supprime (unique).' } }
      }
    }
  }
}

// Chemins speciaux : sessions et upload de document.
const specialPaths = {
  '/initSession': {
    get: {
      tags: ['Session'],
      summary: 'Ouvrir une session et obtenir un session_token',
      parameters: [
        { name: 'Authorization', in: 'header', required: true, schema: { type: 'string' }, description: 'Basic base64(login:password) OU "user_token xxx".' },
        { name: 'App-Token', in: 'header', required: false, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Renvoie { session_token }.' },
        401: { description: 'Identifiants invalides.' }
      }
    }
  },
  '/killSession': {
    get: {
      tags: ['Session'],
      summary: 'Fermer la session',
      parameters: commonHeaders,
      responses: { 200: { description: 'Session fermee.' } }
    }
  },
  '/Document': {
    post: {
      tags: ['Document'],
      summary: 'Envoyer un fichier (upload multipart)',
      description: 'Envoi en multipart/form-data : champ "uploadManifest" (JSON { input: { name, _filename:[...] } }) + fichier dans "filename[0]".',
      parameters: commonHeaders,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                uploadManifest: { type: 'string', description: 'JSON serialise { input: { name, _filename } }.' },
                'filename[0]': { type: 'string', format: 'binary' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Document cree. Renvoie { id }.' } }
    }
  }
}

// Assemble le document OpenAPI final.
const openapi = {
  openapi: '3.0.0',
  info: {
    title: 'GLPI REST API v1 (apirest.php) - endpoints utilises par new-app',
    version: '1.0.0',
    description: 'Documentation generee par tools/gen-apiv1.mjs. Couvre les sessions, le CRUD des itemtypes utilises, l\'upload de Document et les liens Item_Ticket / Document_Item.'
  },
  servers: [{ url: 'http://glpi.local/apirest.php', description: 'API REST GLPI v1' }],
  paths: { ...specialPaths }
}

for (const itemtype of ITEMTYPES) {
  Object.assign(openapi.paths, crudPaths(itemtype))
}

writeFileSync('apiv1.json', JSON.stringify(openapi, null, 2), 'utf-8')
console.log('apiv1.json genere avec ' + Object.keys(openapi.paths).length + ' chemins.')
