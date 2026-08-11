import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// If deploying to GitHub Pages under https://<user>.github.io/<repo>/,
// set BASE_PATH="/<repo>/" as an env var when building (see root README).
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
})
