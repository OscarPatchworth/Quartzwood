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
    // The phone menu (☰): closes when you go to another page
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [menuPath, setMenuPath] = useState(location.pathname)
    if (menuPath !== location.pathname) {
        setMenuPath(location.pathname)
        setIsMenuOpen(false)
    }

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

    // The links on the right: in a row from tablet width up, in the ☰ menu below that
    const navItems = account ? (
        <>
            <Link to="/search" className="hover:text-header-hover">Search</Link>
            <Link to="/trade" className="hover:text-header-hover">Trade</Link>
            <span className="text-header-hover">{account.displayName}</span>
            <button
                type="button"
                onClick={() => void logout().then(() => navigate('/login'))}
                className="text-left hover:text-header-hover"
            >
                Log out
            </button>
        </>
    ) : (
        <>
            <Link to="/login" className="hover:text-header-hover">Log in</Link>
            <Link to="/register" className="hover:text-header-hover">Register</Link>
        </>
    )

    return (
        <header className="relative flex items-center gap-2 bg-header p-4 text-sm text-header-fg">
            <Link to="/" className="shrink-0 font-display text-xl font-semibold tracking-tight hover:text-header-hover">
                Quartzwood
            </Link>

            {/* The collection (root group) is the start of every breadcrumb, and doubles as the main nav link.
                min-w-0 + truncate: a long box name is cut short with "…" instead of pushing the menu off-screen */}
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
                {account && (
                    <>
                        <span className="text-header-muted">|</span>
                        <Link to="/collection" className="shrink-0 hover:text-header-hover">Collection</Link>
                    </>
                )}

                {breadcrumb?.hasCollapsed && (
                    <>
                        <span className="hidden text-header-muted sm:inline">› ... ›</span>
                        <span className="text-header-muted sm:hidden">›</span>
                        <Link
                            to={`/group/${breadcrumb.parentGroupId}`}
                            className="truncate hover:text-header-hover"
                        >
                            {breadcrumb.parentGroupName}
                        </Link>
                    </>
                )}

                {breadcrumb?.boxName && (
                    <>
                        <span className="text-header-muted">›</span>
                        <span className="truncate text-header-fg">{breadcrumb.boxName}</span>
                    </>
                )}
            </nav>

            {/* Right side: account. Hidden until the initial session check finishes to avoid a flash of "Log in" */}
            {!isLoading && (
                <div className="ml-auto flex shrink-0 items-center gap-4">
                    <ThemeToggle />
                    <div className="hidden items-center gap-4 md:flex">{navItems}</div>
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(open => !open)}
                        aria-expanded={isMenuOpen}
                        aria-controls="header-menu"
                        aria-label="Menu"
                        className="rounded px-1.5 text-lg leading-none hover:text-header-hover md:hidden"
                    >
                        {isMenuOpen ? "✕" : "☰"}
                    </button>
                </div>
            )}

            {isMenuOpen && (
                <div id="header-menu" className="absolute inset-x-0 top-full z-40 flex flex-col gap-3 border-t border-header-muted/40 bg-header px-4 py-3 text-base shadow-lg md:hidden">
                    {navItems}
                </div>
            )}
        </header>
    )
}