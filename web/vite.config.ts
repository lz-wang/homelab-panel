import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), 'src'),
            // MUI 9 的 internal/Transition.mjs 裸导入目录
            // `react-transition-group/TransitionGroupContext`（该子包仅声明 main/module、无 exports），
            // Node ESM（vitest）不支持目录导入；显式指向 ESM 文件以修复解析。
            // 构建侧 Vite resolver 本就支持，指向同一文件，行为不变。
            'react-transition-group/TransitionGroupContext': path.resolve(
                process.cwd(),
                'node_modules/react-transition-group/esm/TransitionGroupContext.js',
            ),
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
        server: {
            deps: {
                // @mui/material 默认被外部化到 Node 原生 ESM，其内部 bare-import
                // `react-transition-group/TransitionGroupContext`（目录形式，子包仅声明 main/module、
                // 无 exports）会触发 ERR_UNSUPPORTED_DIR_IMPORT。inline @mui 让其走 Vite resolver，
                // 配合上方 resolve.alias 把该目录导入显式指向 ESM 文件。
                inline: [/@mui\//],
            },
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary', 'html', 'json'],
            reportsDirectory: '../coverage/frontend',
        },
    },
})
