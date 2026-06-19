import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { createContext, useContext, useMemo, useState } from 'react'

type NotifyType = 'success' | 'error' | 'warning' | 'info'

interface NotifyApi {
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
}

const NotifyContext = createContext<NotifyApi | null>(null)

export function NotifyProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState<NotifyType>('info')
    const [message, setMessage] = useState('')

    const api = useMemo<NotifyApi>(() => {
        function show(nextType: NotifyType, nextMessage: string) {
            setType(nextType)
            setMessage(nextMessage)
            setOpen(true)
        }

        return {
            success: (message) => show('success', message),
            error: (message) => show('error', message),
            warning: (message) => show('warning', message),
            info: (message) => show('info', message),
        }
    }, [])

    return (
        <NotifyContext.Provider value={api}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={2500}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={type} variant="filled" onClose={() => setOpen(false)}>
                    {message}
                </Alert>
            </Snackbar>
        </NotifyContext.Provider>
    )
}

export function useNotify() {
    const ctx = useContext(NotifyContext)

    if (!ctx) throw new Error('useNotify must be used inside NotifyProvider')

    return ctx
}
