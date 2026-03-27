import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173, // Default Vite dev server port
        proxy: {
            '/api': 'http://localhost:3001'
        }
    }
})
