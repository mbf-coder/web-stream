import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/web-stream/' : '/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
});