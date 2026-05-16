import { createRouter, createWebHistory } from 'vue-router'
import FrontOfficeLayout from '@/views/frontOffice/FrontOfficeLayout.vue'
import FrontOfficeHomeView from '@/views/frontOffice/FrontOfficeHomeView.vue'
import FrontOfficeUsersView from '@/views/frontOffice/FrontOfficeUsersView.vue'
import FrontOfficeCartView from '@/views/frontOffice/FrontOfficeCartView.vue'
import FrontOfficeCheckoutView from '@/views/frontOffice/FrontOfficeCheckoutView.vue'
import FrontOfficeAccountView from '@/views/frontOffice/FrontOfficeAccountView.vue'
import FrontOfficeOrdersView from '@/views/frontOffice/FrontOfficeOrdersView.vue'
import BackOfficeHomeView from '@/views/backoffice/BackOfficeHomeView.vue'
import BackOfficeLoginView from '@/views/backoffice/BackOfficeLoginView.vue'
import DataImportView from '@/views/backoffice/DataImportView.vue'
import ImportOneShotView from '@/views/backoffice/ImportOneShot.vue'
import DataResetView from '@/views/backoffice/DataResetView.vue'
import BackOfficeOrdersView from '@/views/backoffice/BackOfficeOrdersView.vue'
import BackOfficeDashboardView from '@/views/backoffice/BackOfficeDashboardView.vue'
import BackOfficeStockView from '@/views/backoffice/BackOfficeStockView.vue'
import { isBackOfficeAuthenticated, logoutBackOffice } from '@/services/backofficeAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/frontoffice' },
    {
      path: '/frontoffice',
      component: FrontOfficeLayout,
      children: [
        { path: '', redirect: '/frontoffice/users' },
        { path: 'users', name: 'frontoffice-users', component: FrontOfficeUsersView },
        { path: 'catalog', name: 'frontoffice-catalog', component: FrontOfficeHomeView },
        { path: 'cart', name: 'frontoffice-cart', component: FrontOfficeCartView },
        { path: 'checkout', name: 'frontoffice-checkout', component: FrontOfficeCheckoutView },
        { path: 'account', name: 'frontoffice-account', component: FrontOfficeAccountView },
        { path: 'orders', name: 'frontoffice-orders', component: FrontOfficeOrdersView }
      ]
    },

    { path: '/backoffice/login', name: 'backoffice-login', component: BackOfficeLoginView },
    { path: '/backoffice',name: 'backoffice-home',component: BackOfficeHomeView, meta: { requiresBackOfficeAuth: true }},
    { path: '/backoffice/dashboard', name: 'backoffice-dashboard', component: BackOfficeDashboardView, meta: { requiresBackOfficeAuth: true }},
    { path: '/backoffice/import', name: 'backoffice-import',component: DataImportView, meta: { requiresBackOfficeAuth: true }},
    { path: '/backoffice/import-oneshot', name: 'backoffice-import-oneshot', component: ImportOneShotView, meta: { requiresBackOfficeAuth: true }},
    { path: '/backoffice/orders', name: 'backoffice-orders', component: BackOfficeOrdersView, meta: { requiresBackOfficeAuth: true }},
    { path: '/backoffice/stocks', name: 'backoffice-stocks', component: BackOfficeStockView, meta: { requiresBackOfficeAuth: true }},
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
