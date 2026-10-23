import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getApiGroupsByEntityByEntityId, type GroupDto } from '../interfaces/generated.ts'
import { LoadingIndicator } from '../components/misc/LoadingIndicator'

export default function EntityPage() {
    const { id } = useParams<{ id: string }>()
    const [groups, setGroups] = useState<GroupDto[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        if (!id) return
        getApiGroupsByEntityByEntityId({ path: { entityId: id } })
            .then(res => setGroups(res.data))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <LoadingIndicator />

    return (
        <div className="p-4 sm:p-8">
            <button onClick={() => navigate('/')} className="mb-4 text-link hover:underline">← Back</button>
            <h1 className="text-title mb-6">Groups</h1>
            <div className="grid grid-cols-1 gap-4">
                {groups.map(g => (
                    <div
                        key={g.id}
                        onClick={() => navigate(`/group/${g.id}`)}
                        className="p-4 border border-line-strong rounded cursor-pointer hover:bg-surface-sunken"
                    >
                        <h2 className="text-heading">{g.name}</h2>
                        {g.description && <p className="text-sm text-fg-subtle">{g.description}</p>}
                    </div>
                ))}
                {groups.length === 0 && <p className="text-fg-subtle">No groups found.</p>}
            </div>
        </div>
    )
}