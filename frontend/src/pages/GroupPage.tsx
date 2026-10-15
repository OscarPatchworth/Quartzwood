import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import type { BoxDto, GroupDto } from '../interfaces/generated.ts/types.gen'
import { LoadingIndicator } from '../components/misc/loadingIndicator'
import { AddBoxGroupController } from '../components/BoxGroup/AddBoxGroupController'
import GroupBoxListCard from '../components/BoxGroup/GroupBoxListCard'
import EditableTitle from '../components/misc/EditableTitle'

export default function GroupPage() {
    const { id } = useParams<{ id: string }>()
    const [activeGroup, setActiveGroup] = useState<GroupDto>()
    const [groups, setGroups] = useState<GroupDto[]>([])
    const [boxes, setBoxes] = useState<BoxDto[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingBoxId, setDeletingBoxId] = useState<string>()
    const [deleteError, setDeleteError] = useState<string>()
    const [isEditingName, setIsEditingName] = useState(false)
    const [draftName, setDraftName] = useState(activeGroup?.name ?? '')
    const navigate = useNavigate()

    useEffect(() => {
        setDraftName(activeGroup?.name ?? '')
    }, [activeGroup?.name])

    useEffect(() => {
        setLoading(true)
        Promise.all([
            client.get<BoxDto[]>(`/boxes/by-group/${id}`)
                .then(res => setBoxes(res.data)),
            
            client.get<GroupDto>(`/groups/${id}`)
                .then(res => setActiveGroup(res.data)),

            client.get<GroupDto[]>(`/groups/by-parent/${id}`)
                .then(res => setGroups(res.data))
        ])
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

    async function deleteGroup(group: GroupDto) {
        if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return

        setDeletingBoxId(group.id)
        setDeleteError(undefined)
        try {
            await client.delete(`/groups/${group.id}`)
            setGroups(currentGroups => currentGroups.filter(currentGroup => currentGroup.id !== group.id))
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : `Unable to delete ${group.name}.`)
        } finally {
            setDeletingBoxId(undefined)
        }
    }

    async function saveGroupName() {
        if (!activeGroup) return

        const nextName = draftName.trim()
        if (!nextName || nextName === activeGroup.name) {
            setIsEditingName(false)
            setDraftName(activeGroup.name)
            return
        }

        try {
            const res = await client.put<GroupDto>(`/groups/${activeGroup.id}`, {
                name: nextName,
                description: activeGroup.description ?? null,
                entityId: activeGroup.entityId ?? null,
                parentGroupId: activeGroup.parentGroupId ?? null,
            })
            setActiveGroup(res.data)
            setDraftName(res.data.name)
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Unable to update group name.')
        } finally {
            setIsEditingName(false)
        }
    }

    function handleBoxCreated(box: BoxDto) {
        setBoxes(currentBoxes => [...currentBoxes, box])
    }

    function handleGroupCreated(group: GroupDto) {
        setGroups(currentGroups => [...currentGroups, group])
    }

    if (loading) return <LoadingIndicator />

    return (
        <div className="p-8">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-500 hover:underline">← Back</button>
            
            <div className='flex items-start justify-between align-top'>
                <EditableTitle
                    name={activeGroup?.name ?? ''}
                    draftName={draftName}
                    isEditing={isEditingName}
                    onDraftChange={setDraftName}
                    onSave={() => void saveGroupName()}
                    onCancel={() => { setIsEditingName(false); setDraftName(activeGroup?.name ?? '') }}
                    onStartEdit={() => setIsEditingName(true)}
                />
                <AddBoxGroupController
                    groupId={id}
                    onBoxCreated={handleBoxCreated}
                    onGroupCreated={handleGroupCreated}
                />
            </div>

            {deleteError && <p role="alert" className="mb-4 text-sm text-rose-700">{deleteError}</p>}

            <div className='flex justify-center'>
                <div className="flex gap-8 px-4 w-[75%] justify-between">
                   
                    <GroupBoxListCard
                        title="Groups"
                        items={groups}
                        getId={g => g.id}
                        getName={g => g.name}
                        getSubtitle={g => `${g.childGroupNames.length} items`}
                        onNavigate={g => navigate(`/group/${g.id}`)}
                        onDelete={g => void deleteGroup(g)}
                        deletingId={deletingBoxId}
                        emptyMessage="No groups found."
                    />

                    <GroupBoxListCard
                        title="Boxes"
                        items={boxes}
                        getId={b => b.id}
                        getName={b => b.name}
                        getSubtitle={b => `${b.cardCount} cards`}
                        onNavigate={b => navigate(`/box/${b.id}`)}
                        onDelete={b => void deleteBox(b)}
                        deletingId={deletingBoxId}
                        emptyMessage="No boxes found."
                        className="justify-self-end"
                    />

                </div>
            </div>           
        </div>
    )
}