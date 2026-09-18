import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The hosted widget is served under /widget on pay.mitumba.africa.
export default defineConfig({
  base: '/widget/',
  plugins: [react()],
})
