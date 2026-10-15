import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getApiBreadcrumbById, type BreadcrumbDto } from '../interfaces/generated.ts'

export default function Header() {
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
        </header>
    )
}