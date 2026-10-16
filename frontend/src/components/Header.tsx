import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getApiBreadcrumbById, type BreadcrumbDto } from '../interfaces/generated.ts'
import { useAuth } from '../auth/useAuth'

export default function Header() {
    const { account, isLoading, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const { id } = useParams<{ id: string }>()
    const [breadcrumb, setBreadcrumb] = useState<BreadcrumbDto | null>(null)

    useEffect(() => {
        //console.log('Header route params:', { id, pathname: location.pathname })
        if (!id) {
            setBreadcrumb(null)
            return
        }
        getApiBreadcrumbById({ path: { id } })
            .then(res => setBreadcrumb(res.data))
            .catch(() => setBreadcrumb(null))
    }, [id, location.pathname])

    return (
        <header className="bg-gray-800 text-white p-4 flex items-center gap-2 text-sm">
            <Link to="/" className="font-bold text-lg hover:text-gray-300">
                Quartzwood
            </Link>

            {breadcrumb?.entityName && (
                <>
                    <span className="text-gray-500">›</span>
                    <Link
                        to={`/entity/${breadcrumb.entityId}`}
                        className="hover:text-gray-300"
                    >
                        {breadcrumb.entityName}
                    </Link>
                </>
            )}

            {breadcrumb?.rootGroupName && (
                <>
                    <span className="text-gray-500">›</span>
                    <Link
                        to={`/group/${breadcrumb.rootGroupId}`}
                        className="hover:text-gray-300"
                    >
                        {breadcrumb.rootGroupName}
                    </Link>
                </>
            )}

            {breadcrumb?.hasCollapsed && (
                <>
                    <span className="text-gray-500">›</span>
                    <span className="text-gray-500">...</span>
                    <span className="text-gray-500">›</span>
                    <Link
                        to={`/group/${breadcrumb.parentGroupId}`}
                        className="hover:text-gray-300"
                    >
                        {breadcrumb.parentGroupName}
                    </Link>
                </>
            )}

            {breadcrumb?.boxName && (
                <>
                    <span className="text-gray-500">›</span>
                    <span className="text-white">{breadcrumb.boxName}</span>
                </>
            )}

            {/* Right side: account. Hidden until the initial session check finishes to avoid a flash of "Log in" */}
            {!isLoading && (
                <div className="ml-auto flex items-center gap-4">
                    {account ? (
                        <>
                            <span className="text-gray-300">{account.displayName}</span>
                            <button
                                type="button"
                                onClick={() => void logout().then(() => navigate('/login'))}
                                className="hover:text-gray-300"
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:text-gray-300">Log in</Link>
                            <Link to="/register" className="hover:text-gray-300">Register</Link>
                        </>
                    )}
                </div>
            )}
        </header>
    )
}