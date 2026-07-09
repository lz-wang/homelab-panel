import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { createContext, useContext, useState } from 'react'

import { useTranslation } from '@/locales'

interface ConfirmOptions {
    title?: string
    content: string
    confirmText?: string
    cancelText?: string
}

type Resolver = (value: boolean) => void

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(() =>
    Promise.resolve(false),
)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation()
    const [options, setOptions] = useState<ConfirmOptions | null>(null)
    const [resolver, setResolver] = useState<Resolver | null>(null)

    function confirm(nextOptions: ConfirmOptions) {
        setOptions(nextOptions)

        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve)
        })
    }

    function close(value: boolean) {
        resolver?.(value)
        setOptions(null)
        setResolver(null)
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog open={Boolean(options)} onClose={() => close(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{options?.title ?? t('common.operationConfirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{options?.content}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button variant="text" onClick={() => close(false)}>
                        {options?.cancelText ?? t('common.cancel')}
                    </Button>
                    <Button color="error" onClick={() => close(true)}>
                        {options?.confirmText ?? t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </ConfirmContext.Provider>
    )
}

export function useConfirm() {
    return useContext(ConfirmContext)
}
