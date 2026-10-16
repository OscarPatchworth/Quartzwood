import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "./useAuth"
import { LoadingIndicator } from "../components/misc/LoadingIndicator"

// Wraps routes that need a logged-in user: the API would only answer 401 otherwise
export function RequireAuth() {
    const { account, isLoading } = useAuth()

    // Wait for the initial session check, or a refresh would briefly bounce to /login
    if (isLoading) return <LoadingIndicator />
    if (!account) return <Navigate to="/login" replace />

    return <Outlet />
}
