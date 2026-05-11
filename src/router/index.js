import { createRouter, createWebHistory } from 'vue-router'
import FrontOfficeView from '@/views/FrontOfficeView.vue'
import BackOfficeHomeView from '@/views/backoffice/BackOfficeHomeView.vue'
import BackOfficeLoginView from '@/views/backoffice/BackOfficeLoginView.vue'
import DataImportView from '@/views/backoffice/DataImportView.vue'
import DataResetView from '@/views/backoffice/DataResetView.vue'
import { isBackOfficeAuthenticated, logoutBackOffice } from '@/services/backofficeAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/frontoffice' },
    { path: '/frontoffice', name: 'frontoffice', component: FrontOfficeView },

    { path: '/backoffice/login', name: 'backoffice-login', component: BackOfficeLoginView },
    { path: '/backoffice',name: 'backoffice-home',component: BackOfficeHomeView, meta: { requiresBackOfficeAuth: true }},
    { path: '/backoffice/import', name: 'backoffice-import',component: DataImportView, meta: { requiresBackOfficeAuth: true }},
    { path: '/backoffice/reset',name: 'backoffice-reset',component: DataResetView, meta: { requiresBackOfficeAuth: true }}
  
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  if (to.path === '/' || to.path.startsWith('/frontoffice')) {
    logoutBackOffice()
  }

  if (to.meta.requiresBackOfficeAuth && !isBackOfficeAuthenticated()) {
    return {
      name: 'backoffice-login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.name === 'backoffice-login' && isBackOfficeAuthenticated()) {
    return { name: 'backoffice-home' }
  }

  return true
})

export default router
