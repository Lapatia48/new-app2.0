import { createRouter, createWebHistory } from 'vue-router'
import DataHomeView from '@/views/DataHomeView.vue'
import DataImportView from '@/views/DataImportView.vue'
import DataResetView from '@/views/DataResetView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/data' },
    { path: '/data', name: 'data-home', component: DataHomeView },
    { path: '/data/import', name: 'data-import', component: DataImportView },
    { path: '/data/reset', name: 'data-reset', component: DataResetView }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
