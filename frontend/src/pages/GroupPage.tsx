import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import type { BoxDto } from '../interfaces/generated.ts/types.gen'
import { LoadingIndicator } from '../components/misc/loadingIndicator'
import { AddBoxGroupController } from '../components/BoxGroup/AddBoxGroupController'

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
            
            <div className='flex items-start justify-between align-top'>
                <h1 className="text-2xl font-bold">Boxes</h1>
                <AddBoxGroupController/>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {boxes.map(b => (
                    <div
                        key={b.id}
                        onClick={() => navigate(`/box/${b.id}`)}
                        className="flex items-center justify-between rounded border p-4 cursor-pointer hover:bg-gray-100"
                    >
                        <div>
                            <h2 className="text-lg font-semibold">{b.name}</h2>
                            <p className="text-sm text-gray-500">{b.cardCount} cards</p>
                        </div>
                        <div className="self-stretch">
                            <button
                                type="button"
                                onClick={event => event.stopPropagation()}
                                aria-label={`Delete ${b.name}`}
                                className="h-full rounded-3xl bg-amber-100 px-5 text-3xl text-rose-700 transition-colors hover:bg-amber-200 hover:text-rose-500"
                            >
                                ✘
                            </button>
                        </div>
                    </div>
                ))}
                {boxes.length === 0 && <p className="text-gray-500">No boxes found.</p>}
            </div>
        </div>
    )
}