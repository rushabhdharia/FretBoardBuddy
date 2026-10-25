import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createApi } from './server/api.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // the SQLite API runs inside the dev server, so `npm run dev` is all you need
    { name: 'fbb-api', configureServer: server => void server.middlewares.use(createApi(process.env.FBB_DB)) },
  ],
})
