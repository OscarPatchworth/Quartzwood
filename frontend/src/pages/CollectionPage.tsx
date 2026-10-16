import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoadingIndicator } from '../components/misc/LoadingIndicator'
import GroupPage from './GroupPage'

// "My Collection": the logged-in user's root group, shown with the normal group page
export default function CollectionPage() {
    const { account, isLoading } = useAuth()

    if (isLoading) return <LoadingIndicator />
    if (!account) return <Navigate to="/login" replace />

    // key: remount if a different user logs in, so the old collection isn't shown
    return <GroupPage key={account.rootGroupId} groupId={account.rootGroupId} />
}
