import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getApiBreadcrumbById, type BreadcrumbDto } from '../interfaces/generated.ts'
import { useAuth } from '../auth/useAuth'
import { ThemeToggle } from '../theme/ThemeToggle'

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
        <header className="bg-header text-header-fg p-4 flex items-center gap-2 text-sm">
            <Link to="/" className="font-bold text-lg hover:text-header-hover">
                Quartzwood
            </Link>

            {/* The collection (root group) is the start of every breadcrumb, and doubles as the main nav link */}
            {account && (
                <>
                    <span className="text-header-muted">|</span>
                    <Link to="/collection" className="hover:text-header-hover">Collection</Link>
                </>
            )}

            {breadcrumb?.hasCollapsed && (
                <>
                    <span className="text-header-muted">›</span>
                    <span className="text-header-muted">...</span>
                    <span className="text-header-muted">›</span>
                    <Link
                        to={`/group/${breadcrumb.parentGroupId}`}
                        className="hover:text-header-hover"
                    >
                        {breadcrumb.parentGroupName}
                    </Link>
                </>
            )}

            {breadcrumb?.boxName && (
                <>
                    <span className="text-header-muted">›</span>
                    <span className="text-header-fg">{breadcrumb.boxName}</span>
                </>
            )}

            {/* Right side: account. Hidden until the initial session check finishes to avoid a flash of "Log in" */}
            {!isLoading && (
                <div className="ml-auto flex items-center gap-4">
                    <ThemeToggle />
                    {account ? (
                        <>
                            <Link to="/search" className="hover:text-header-hover">Search</Link>
                            <Link to="/trade" className="hover:text-header-hover">Trade</Link>
                            <span className="text-header-hover">{account.displayName}</span>
                            <button
                                type="button"
                                onClick={() => void logout().then(() => navigate('/login'))}
                                className="hover:text-header-hover"
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:text-header-hover">Log in</Link>
                            <Link to="/register" className="hover:text-header-hover">Register</Link>
                        </>
                    )}
                </div>
            )}
        </header>
    )
}