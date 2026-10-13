import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import type { BoxDto, GroupDto } from '../interfaces/generated.ts/types.gen'
import { LoadingIndicator } from '../components/misc/loadingIndicator'
import { AddBoxGroupController } from '../components/BoxGroup/AddBoxGroupController'

export default function GroupPage() {
    const { id } = useParams<{ id: string }>()
    const [boxes, setBoxes] = useState<BoxDto[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingBoxId, setDeletingBoxId] = useState<string>()
    const [deleteError, setDeleteError] = useState<string>()
    const navigate = useNavigate()

    useEffect(() => {
        setLoading(true)
        client.get<BoxDto[]>(`/boxes/by-group/${id}`)
            .then(res => setBoxes(res.data))
            .finally(() => setLoading(false))
    }, [id])

    async function deleteBox(box: BoxDto) {
        if (!window.confirm(`Delete "${box.name}"? This cannot be undone.`)) return

        setDeletingBoxId(box.id)
        setDeleteError(undefined)
        try {
            await client.delete(`/boxes/${box.id}`)
            setBoxes(currentBoxes => currentBoxes.filter(currentBox => currentBox.id !== box.id))
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : `Unable to delete ${box.name}.`)
        } finally {
            setDeletingBoxId(undefined)
        }
    }

    function handleBoxCreated(box: BoxDto) {
        setBoxes(currentBoxes => [...currentBoxes, box])
    }

    function handleGroupCreated(group: GroupDto) {
        navigate(`/group/${group.id}`)
    }

    if (loading) return <LoadingIndicator />

    return (
        <div className="p-8">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-500 hover:underline">← Back</button>
            
            <div className='flex items-start justify-between align-top'>
                <h1 className="text-2xl font-bold">Boxes</h1>
                <AddBoxGroupController
                    groupId={id}
                    onBoxCreated={handleBoxCreated}
                    onGroupCreated={handleGroupCreated}
                />
            </div>

            {deleteError && <p role="alert" className="mb-4 text-sm text-rose-700">{deleteError}</p>}

            <div className="grid grid-cols-1 gap-4">
                {boxes.map(b => (
                    <div
                        key={b.id}
                        onClick={() => navigate(`/box/${b.id}`)}
                        className="flex w-80/100 items-center align-center justify-between rounded border p-4 cursor-pointer hover:bg-gray-100"
                    >
                        <div>
                            <h2 className="text-lg font-semibold">{b.name}</h2>
                            <p className="text-sm text-gray-500">{b.cardCount} cards</p>
                        </div>
                        <div className="flex self-stretch items-center">
                            <button
                                type="button"
                                onClick={event => {
                                    event.stopPropagation()
                                    void deleteBox(b)
                                }}
                                aria-label={`Delete ${b.name}`}
                                disabled={deletingBoxId === b.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded border border-red-200 bg-red-50 text-2xl font-bold leading-none text-red-600 transition hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
                {boxes.length === 0 && <p className="text-gray-500">No boxes found.</p>}
            </div>
        </div>
    )
}