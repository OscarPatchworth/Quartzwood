import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import type { GroupDto } from '../interfaces/generated.ts/types.gen'
import { LoadingIndicator } from '../components/misc/loadingIndicator'

export default function EntityPage() {
    const { id } = useParams<{ id: string }>()
    const [groups, setGroups] = useState<GroupDto[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        client.get<GroupDto[]>(`/groups/by-entity/${id}`)
            .then(res => setGroups(res.data))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <LoadingIndicator />

    return (
        <div className="p-8">
            <button onClick={() => navigate('/')} className="mb-4 text-blue-500 hover:underline">← Back</button>
            <h1 className="text-2xl font-bold mb-6">Groups</h1>
            <div className="grid grid-cols-1 gap-4">
                {groups.map(g => (
                    <div
                        key={g.id}
                        onClick={() => navigate(`/group/${g.id}`)}
                        className="p-4 border rounded cursor-pointer hover:bg-gray-100"
                    >
                        <h2 className="text-lg font-semibold">{g.name}</h2>
                        {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                    </div>
                ))}
                {groups.length === 0 && <p className="text-gray-500">No groups found.</p>}
            </div>
        </div>
    )
}