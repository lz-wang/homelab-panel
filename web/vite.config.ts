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
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: 'react-vendor',
                            priority: 30,
                            test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                        },
                        {
                            name: 'mui-vendor',
                            priority: 20,
                            test: /node_modules[\\/](@mui|@emotion)[\\/]/,
                        },
                        {
                            name: 'icon-vendor',
                            priority: 10,
                            test: /node_modules[\\/](@iconify)[\\/]/,
                        },
                        {
                            name: 'vendor',
                            test: /node_modules/,
                        },
                    ],
                },
            },
        },
        sourcemap: false,
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
    },
})
