import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 8080,
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://huggingface.co/spaces/amkyawdev/burme-subtitle-api'),
  },
});