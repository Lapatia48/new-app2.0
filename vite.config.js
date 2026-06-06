import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      // Tout ce qui commence par /glpi est renvoye vers le serveur GLPI.
      // Cela evite les erreurs CORS pendant le developpement.
      // Exemple : /glpi/api.php/token  ->  http://glpi.local/api.php/token
      '/glpi': {
        target: 'http://glpi.local',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/glpi/, '')
      }
    }
  }
})
