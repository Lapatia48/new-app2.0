import { createRouter, createWebHistory } from 'vue-router'
import login from '../views/backoffice/login.vue'
import BackOfficeLayout from '../views/backoffice/BackOfficeLayout.vue'
import BackOfficeHome from '../views/backoffice/BackOfficeHome.vue'
import DashboardPage from '../views/backoffice/DashboardPage.vue'
import TicketsPage from '../views/backoffice/TicketsPage.vue'
import ImportPage from '../views/backoffice/ImportPage.vue'
import ResetPage from '../views/backoffice/ResetPage.vue'
import frontoffficeAcceuil from '../views/frontoffice/frontoffficeAcceuil.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Page de connexion du backoffice
    { path: '/backoffice', name: 'backoffice', component: login },

    // Pages du backoffice : elles partagent le meme menu (BackOfficeLayout)
    {
      path: '/backoffice/home',
      component: BackOfficeLayout,
      children: [
        { path: '', name: 'backoffice-home', component: BackOfficeHome },
        { path: 'dashboard', name: 'bo-dashboard', component: DashboardPage },
        { path: 'tickets', name: 'bo-tickets', component: TicketsPage },
        { path: 'import', name: 'bo-import', component: ImportPage },
        { path: 'reset', name: 'bo-reset', component: ResetPage }
      ]
    },

    // Frontoffice
    { path: '/frontOffice', name: 'frontoffice', component: frontoffficeAcceuil }
  ]
})

export default router
