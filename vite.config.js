import { defineConfig } from 'vite';
export default defineConfig({base:'/AB-Premier/',build:{rollupOptions:{input:{portal:'index.html',admin:'admin.html'}}}});
