import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), 'src'),
        },
    },
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 1002,
        open: false,
    },
    build: {
        reportCompressedSize: false,
        sourcemap: false,
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
    },
})
