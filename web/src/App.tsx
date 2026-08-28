import { useEffect } from 'react'

import { useFavicon } from './hooks/useFavicon'
import { useTranslation } from './locales'
import { AppRouter } from './router/AppRouter'

export default function App() {
    useFavicon()
    const { lang } = useTranslation()

    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])

    return <AppRouter />
}
