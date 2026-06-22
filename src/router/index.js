import { createRouter, createWebHistory } from 'vue-router'
import login from '../views/backoffice/login.vue'
import BackOfficeLayout from '../views/backoffice/BackOfficeLayout.vue'
import BackOfficeHome from '../views/backoffice/BackOfficeHome.vue'
import DashboardPage from '../views/backoffice/DashboardPage.vue'
import TicketsPage from '../views/backoffice/TicketsPage.vue'
import ImportPage from '../views/backoffice/ImportPage.vue'
import ResetPage from '../views/backoffice/ResetPage.vue'
import FrontOfficeLayout from '../views/frontoffice/FrontOfficeLayout.vue'
import frontoffficeAcceuil from '../views/frontoffice/frontoffficeAcceuil.vue'
import ElementsPage from '../views/frontoffice/ElementsPage.vue'
import NewTicketPage from '../views/frontoffice/NewTicketPage.vue'
import TicketkabanPage from '../views/frontoffice/TicketkabanPage.vue'
import KanbanConfig from '../views/backoffice/KanbanConfig.vue'
import CostPerItemPage from '../views/backoffice/CostPerItemPage.vue'
import MouvementImportPage from '../views/backoffice/MouvementImportPage.vue'
import CrudCout from '../views/backoffice/CrudCout.vue'

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
        { path: 'import-mouvements', name: 'bo-import-mvt', component: MouvementImportPage },
        { path: 'reset', name: 'bo-reset', component: ResetPage },
        { path: 'kanban-config', name: 'bo-kanban-config', component: KanbanConfig },
        { path: 'cout-item', name: 'bo-cout-item', component: CostPerItemPage },
        { path: 'crud-cout', name: 'bo-crud-cout', component: CrudCout }
      ]
    },

    // Frontoffice : pages partageant le meme menu (FrontOfficeLayout)
    {
      path: '/frontOffice',
      component: FrontOfficeLayout,
      children: [
        { path: '', name: 'frontoffice', component: frontoffficeAcceuil },
        { path: 'elements', name: 'fo-elements', component: ElementsPage },
        { path: 'nouveau-ticket', name: 'fo-new-ticket', component: NewTicketPage },
        { path: 'ticketkaban', name:'fo-ticket-kaban', component: TicketkabanPage}
      ]
    }
  ]
})

export default router
