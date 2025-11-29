import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Use environment variable for API base URL, fallback to localhost for dev
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // Don't rewrite - keep /api prefix so backend can route correctly
        },
      },
    },
  };
})