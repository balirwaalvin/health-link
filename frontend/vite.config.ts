import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'  
import tailwindcss from '@tailwindcss/vite'  

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = String(env.VITE_API_URL || '').trim();

  if (mode === 'production') {
    const isPlaceholder =
      !apiUrl ||
      apiUrl.includes('your-domain.com') ||
      apiUrl.includes('example.com');

    if (isPlaceholder) {
      throw new Error(
        'Invalid VITE_API_URL for production build. Set VITE_API_URL to your real backend domain.'
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
