import { fileURLToPath } from 'node:url';
import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [base44(), react()],
  resolve: {
    // Código compartido con las funciones backend (ej. cálculo de disponibilidad)
    alias: { '@shared': fileURLToPath(new URL('./base44/shared', import.meta.url)) },
  },
});
