import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/getErrorMessage'
import {
    deleteApiBoxesById,
    deleteApiGroupsById,
    getApiBoxesByGroupByGroupId,
    getApiGroupsById,
    getApiGroupsByParentByParentId,
    putApiGroupsById,
    type BoxDto,
    type GroupDto,
} from '../interfaces/generated.ts'
import { LoadingIndicator } from '../components/misc/LoadingIndicator'
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
        if (!id) return
        setLoading(true)
        Promise.all([
            getApiBoxesByGroupByGroupId({ path: { groupId: id } })
                .then(res => setBoxes(res.data)),

            getApiGroupsById({ path: { id } })
                .then(res => setActiveGroup(res.data)),

            getApiGroupsByParentByParentId({ path: { parentId: id } })
                .then(res => setGroups(res.data))
        ])
            .finally(() => setLoading(false))

    }, [id])

    async function deleteBox(box: BoxDto) {
        if (!window.confirm(`Delete "${box.name}"? This cannot be undone.`)) return

        setDeletingBoxId(box.id)
        setDeleteError(undefined)
        try {
            await deleteApiBoxesById({ path: { id: box.id } })
            setBoxes(currentBoxes => currentBoxes.filter(currentBox => currentBox.id !== box.id))
        } catch (error) {
            setDeleteError(getErrorMessage(error, `Unable to delete ${box.name}.`))
        } finally {
            setDeletingBoxId(undefined)
        }
    }

    async function deleteGroup(group: GroupDto) {
        if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return

        setDeletingBoxId(group.id)
        setDeleteError(undefined)
        try {
            await deleteApiGroupsById({ path: { id: group.id } })
            setGroups(currentGroups => currentGroups.filter(currentGroup => currentGroup.id !== group.id))
        } catch (error) {
            setDeleteError(getErrorMessage(error, `Unable to delete ${group.name}.`))
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
            const res = await putApiGroupsById({
                path: { id: activeGroup.id },
                body: {
                    name: nextName,
                    description: activeGroup.description ?? null,
                    parentGroupId: activeGroup.parentGroupId ?? null,
                },
            })
            setActiveGroup(res.data)
            setDraftName(res.data.name)
        } catch (error) {
            setDeleteError(getErrorMessage(error, 'Unable to update group name.'))
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