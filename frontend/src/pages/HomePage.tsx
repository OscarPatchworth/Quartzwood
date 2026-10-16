import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoadingIndicator } from '../components/misc/LoadingIndicator'

// "/" has no page of its own: logged in -> your collection, otherwise -> log in
export default function HomePage() {
    const { account, isLoading } = useAuth()

    if (isLoading) return <LoadingIndicator />
    return <Navigate to={account ? '/collection' : '/login'} replace />
}
