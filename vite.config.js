import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // host: true -> escucha en todas las interfaces de red: la app se abre desde la
  // PC servidor (http://localhost:5173) y desde cualquier equipo o celular de la
  // red local (http://192.168.x.x:5173).
  // Para entrar por el nombre del equipo en vez de la IP (http://pc-servidor:5173),
  // agregar aquí: allowedHosts: ['pc-servidor'].
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
})
