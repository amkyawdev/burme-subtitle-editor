import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
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
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://burme-subtitle-api.hf.space'),
    },
  };
});