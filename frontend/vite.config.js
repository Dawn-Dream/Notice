import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { loadEnv } from 'vite';
import * as sass from 'sass';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../');
  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: Number(env.FRONTEND_PORT) || 5173,
      proxy: {
        '/api': env.API_PROXY || 'http://localhost:3000'
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          implementation: sass
        }
      }
    }
  };
}); 