import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'  
import tailwindcss from '@tailwindcss/vite'  

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = String(
    process.env.VITE_API_URL ||
      process.env.VITE_API_BASE_URL ||
      env.VITE_API_URL ||
      env.VITE_API_BASE_URL ||
      ''
  ).trim();

  if (mode === 'production') {
    const isPlaceholder = Boolean(apiUrl) && (apiUrl.includes('your-domain.com') || apiUrl.includes('example.com'));

    if (isPlaceholder) {
      throw new Error(
        'Invalid production API URL. Remove placeholder API env values or set VITE_API_URL (or VITE_API_BASE_URL) to a real backend URL.'
      );
    }
  }

  return {
    plugins: [tailwindcss(), react()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
  };
});
