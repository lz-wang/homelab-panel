import { useFavicon } from './hooks/useFavicon'
import { AppRouter } from './router/AppRouter'

export default function App() {
    useFavicon()
    return <AppRouter />
}
