import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins:[react(), tailwindcss()],
  server:{port:5173, strictPort:true, proxy:{
    '/api':{target:'http://127.0.0.1', changeOrigin:true, rewrite:(path)=>path.replace(/^\/api/,'/FUTA%20Homes/backend/api.php')},
    '/media':{target:'http://127.0.0.1', changeOrigin:true, rewrite:(path)=>path.replace(/^\/media/,'/FUTA%20Homes/backend/uploads')},
  }}
});
