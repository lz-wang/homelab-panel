import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './global.css'

import CssBaseline from '@mui/material/CssBaseline'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import { ThemeProvider } from '@mui/material/styles'
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import { ConfirmProvider } from './components/common/ConfirmProvider'
import { NotifyProvider } from './components/common/NotifyProvider'
import { theme } from './theme/theme'

const rootElement = document.getElementById('root')

if (!rootElement) {
    throw new Error('Root element #root was not found')
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <InitColorSchemeScript
            attribute="data-mui-color-scheme"
            defaultMode="system"
            modeStorageKey="homelab-color-mode"
        />
        <ThemeProvider theme={theme} defaultMode="system" modeStorageKey="homelab-color-mode">
            <CssBaseline />
            <NotifyProvider>
                <ConfirmProvider>
                    <App />
                </ConfirmProvider>
            </NotifyProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
