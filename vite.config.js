import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  return {
    plugins: [vue()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Vercel output configuration
      outDir: '.output',
      rollupOptions: {
        output: {
          // Vercel Serverless function entry
          entryFileNames: 'api/index.js',
          chunkFileNames: 'api/chunks/[name]-[hash].js',
          assetFileNames: 'api/assets/[name]-[hash][extname]',
        },
      },
    },
    server: {
      port: 8080,
    },
    // Define environment variables for Vercel
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('https://huggingface.co/spaces/amkyawdev/burme-subtitle-api'),
    },
  };
});