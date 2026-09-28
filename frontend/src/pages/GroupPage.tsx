import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import type { BoxDto } from '../interfaces/generated.ts/types.gen'
import { LoadingIndicator } from '../components/misc/loadingIndicator'

export default function GroupPage() {
    const { id } = useParams<{ id: string }>()
    const [boxes, setBoxes] = useState<BoxDto[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        client.get<BoxDto[]>(`/boxes/by-group/${id}`)
            .then(res => setBoxes(res.data))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <LoadingIndicator />

    return (
        <div className="p-8">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-500 hover:underline">← Back</button>
            <h1 className="text-2xl font-bold mb-6">Boxes</h1>
            <div className="grid grid-cols-1 gap-4">
                {boxes.map(b => (
                    <div
                        key={b.id}
                        onClick={() => navigate(`/box/${b.id}`)}
                        className="p-4 border rounded cursor-pointer hover:bg-gray-100"
                    >
                        <h2 className="text-lg font-semibold">{b.name}</h2>
                        <p className="text-sm text-gray-500">{b.cardCount} cards</p>
                    </div>
                ))}
                {boxes.length === 0 && <p className="text-gray-500">No boxes found.</p>}
            </div>
        </div>
    )
}