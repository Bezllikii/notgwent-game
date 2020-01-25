import Vue from 'vue';
import VueRouter from 'vue-router';
Vue.use(VueRouter);
const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/Vue/views/Home.vue')
    }
];
const router = new VueRouter({
    mode: 'history',
    routes
});
export default router;
//# sourceMappingURL=index.js.map