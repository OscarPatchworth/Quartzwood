import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { LoadingIndicator } from '../components/misc/loadingIndicator'

// Shape of data coming from API
interface Entity {
    id: string
    name: string
    type: string
    location: string | null
}

export default function HomePage() {
    const [entities, setEntities] = useState<Entity[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    // Runs once on mount — fetches data
    useEffect(() => {
        client.get<Entity[]>('/entities')
            .then(res => setEntities(res.data))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <LoadingIndicator />

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Collections</h1>
            <div className="grid grid-cols-1 gap-4">
                {entities.map(e => (
                    <div
                        key={e.id}
                        onClick={() => navigate(`/entity/${e.id}`)}
                        className="p-4 border rounded cursor-pointer hover:bg-gray-100"
                    >
                        <h2 className="text-lg font-semibold">{e.name}</h2>
                        <p className="text-sm text-gray-500">{e.type}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}