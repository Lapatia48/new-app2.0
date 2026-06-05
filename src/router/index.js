import { createRouter, createWebHistory } from 'vue-router'
import login from '../views/backoffice/login.vue'
import BackOfficeHome from '../views/backoffice/BackOfficeHome.vue'
import frontoffficeAcceuil from '../views/frontoffice/frontoffficeAcceuil.vue'


const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/backoffice', name: 'backoffice', component: login},
    { path: '/backoffice/home', name: 'backoffice-home', component: BackOfficeHome },
    { path: '/frontOffice', name: 'frontoffice', component: frontoffficeAcceuil},

  ]

})

export default router