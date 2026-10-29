import { useCallback, useEffect, useState } from 'react'
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
import { ExportMenu } from '../components/ImportExport/ExportMenu'
import { ParentGroupBanner } from '../components/BoxGroup/ParentGroupBanner'
import { MoveToGroupDialog } from '../components/BoxGroup/MoveToGroupDialog'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { moveItem, onMoveElsewhere, type MovableItem } from '../utils/moveBoxGroup'
import { VisibilityControl } from '../components/BoxGroup/VisibilityControl'
import { NotFoundMessage } from '../components/BoxGroup/NotFoundMessage'
import { useAuth } from '../auth/useAuth'

interface GroupPageProps {
    // Set by CollectionPage to show the root group; otherwise the id comes from /group/:id
    groupId?: string
}

export default function GroupPage({ groupId }: GroupPageProps) {
    const params = useParams<{ id: string }>()
    const id = groupId ?? params.id
    const [activeGroup, setActiveGroup] = useState<GroupDto>()
    // The group this one sits inside (none for the collection itself)
    const [parentGroup, setParentGroup] = useState<GroupDto>()
    const [groups, setGroups] = useState<GroupDto[]>([])
    const [boxes, setBoxes] = useState<BoxDto[]>([])
    const [loading, setLoading] = useState(true)
    // Loading failed: a 404 (doesn't exist, or Private and you're not a member) or a server error
    const [loadError, setLoadError] = useState<unknown>()
    const { account } = useAuth()
    const [deletingBoxId, setDeletingBoxId] = useState<string>()
    const [deleteError, setDeleteError] = useState<string>()
    const [isEditingName, setIsEditingName] = useState(false)
    const [draftName, setDraftName] = useState(activeGroup?.name ?? '')
    const navigate = useNavigate()

    useEffect(() => {
        setDraftName(activeGroup?.name ?? '')
    }, [activeGroup?.name])

    // Fetches the group, its parent, and what's inside it. Shared by the first load and reloads after a move
    const loadGroup = useCallback((groupId: string) => Promise.all([
        getApiBoxesByGroupByGroupId({ path: { groupId } })
            .then(res => setBoxes(res.data)),

        getApiGroupsById({ path: { id: groupId } })
            .then(async res => {
                setActiveGroup(res.data)
                const parentId = res.data.parentGroupId
                // A visitor may not be able to see the parent (a shared group inside a private one): no banner then
                setParentGroup(parentId
                    ? await getApiGroupsById({ path: { id: parentId } }).then(parent => parent.data, () => undefined)
                    : undefined)
            }),

        getApiGroupsByParentByParentId({ path: { parentId: groupId } })
            .then(res => setGroups(res.data))
    ]), [])

    useEffect(() => {
        if (!id) return
        setLoading(true)
        setLoadError(undefined)
        loadGroup(id)
            .catch(error => setLoadError(error ?? 'error'))
            .finally(() => setLoading(false))
    }, [id, loadGroup])

    // Something moved in another tab/window: reload quietly (no spinner), it may have come or gone from here
    useEffect(() => {
        if (!id) return
        return onMoveElsewhere(() => void loadGroup(id).catch(() => {}))
    }, [id, loadGroup])

    // Drag-and-drop needs a mouse-sized screen; phones (and everyone else) get the Move button
    const canDrag = useMediaQuery('(width >= 48rem)')
    const [movingItem, setMovingItem] = useState<MovableItem>()

    async function handleDrop(item: MovableItem, toGroupId: string) {
        setDeleteError(undefined)
        try {
            await moveItem(item, toGroupId)
        } catch (error) {
            setDeleteError(getErrorMessage(error, `Unable to move ${item.name}.`))
        }
        // Reload either way: the counts on the target row change, and a failed move may be stale data
        if (id) await loadGroup(id).catch(() => {})
    }

    const groupItem = (g: GroupDto): MovableItem => ({ kind: 'group', id: g.id, name: g.name, fromGroupId: id ?? '' })
    const boxItem = (b: BoxDto): MovableItem => ({ kind: 'box', id: b.id, name: b.name, fromGroupId: id ?? '' })

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
    if (loadError !== undefined || !activeGroup) return <NotFoundMessage isLoggedIn={!!account} error={loadError} />

    // The root group (no parent) is a collection: nothing above it to go back to
    const isRoot = activeGroup.parentGroupId === null
    // Members can change things; anyone else is viewing an Unlisted/Public group (read-only)
    const canEdit = activeGroup.canEdit ?? false
    // Your own collection is "My Collection" (a collection shared with you, or someone else's, shows its name)
    const myCollectionName = (group: GroupDto) => group.id === account?.rootGroupId ? 'My Collection' : group.name
    // Rows shared beyond the members get a label, so you can see at a glance what others can see
    const sharedBadge = (item: GroupDto | BoxDto) => {
        const effective = item.visibility ?? item.inheritedVisibility
        return canEdit && effective && effective !== 'Private' ? effective : undefined
    }

    return (
        <>
        <div className='bg-banner-group px-10 py-5 sm:px-8'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                {/* Back above the title, tight together (the collection itself has nothing to go back to) */}
                <div className='flex min-w-0 flex-col gap-1'>
                    {!isRoot && (
                        <button onClick={() => navigate(-1)} className="self-start text-sm text-link hover:underline">← Back</button>
                    )}
                    {isRoot || !canEdit ? (
                        <h1 className="truncate text-title">{myCollectionName(activeGroup)}</h1>
                    ) : (
                        <EditableTitle
                            name={activeGroup?.name ?? ''}
                            draftName={draftName}
                            isEditing={isEditingName}
                            onDraftChange={setDraftName}
                            onSave={() => void saveGroupName()}
                            onCancel={() => { setIsEditingName(false); setDraftName(activeGroup?.name ?? '') }}
                            onStartEdit={() => setIsEditingName(true)}
                            className="truncate"
                        />
                    )}
                    <VisibilityControl
                        item={activeGroup}
                        kind="group"
                        isRoot={isRoot}
                        onChanged={updated => {
                            setActiveGroup(updated)
                            // The rows' "same as parent" now means something else: reload them for their badges
                            if (id) void loadGroup(id).catch(() => {})
                        }}
                    />
                </div>
                {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                        {/* On the collection page this exports the whole collection */}
                        {id && <ExportMenu kind="group" id={id} />}
                        <AddBoxGroupController
                            groupId={id}
                            onBoxCreated={handleBoxCreated}
                            onGroupCreated={handleGroupCreated}
                        />
                    </div>
                )}
            </div>
        </div>
            
            <div className="p-4 sm:p-8">
            {deleteError && <p role="alert" className="mb-4 text-sm text-danger">{deleteError}</p>}
            
            <div className='flex justify-center'>
                <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2 md:px-4">

                    {/* Up one level: the group this one is inside, across both columns */}
                    {parentGroup && (
                        <ParentGroupBanner
                            parentGroup={parentGroup}
                            name={myCollectionName(parentGroup)}
                            onNavigate={() => navigate(parentGroup.id === account?.rootGroupId ? '/collection' : `/group/${parentGroup.id}`)}
                            onDropItem={canEdit && canDrag ? handleDrop : undefined}
                        />
                    )}

                    <GroupBoxListCard
                        title="Groups"
                        items={groups}
                        getId={g => g.id}
                        getName={g => g.name}
                        getSubtitle={g => {
                            const groups = g.childGroupNames.length
                            const boxes = g.boxNames.length
                            return `${groups} ${groups === 1 ? 'group' : 'groups'}, ${boxes} ${boxes === 1 ? 'box' : 'boxes'}`
                        }}
                        onNavigate={g => navigate(`/group/${g.id}`)}
                        onDelete={canEdit ? g => void deleteGroup(g) : undefined}
                        deletingId={deletingBoxId}
                        emptyMessage="No groups found."
                        onMove={canEdit ? g => setMovingItem(groupItem(g)) : undefined}
                        getDragItem={canEdit && canDrag ? groupItem : undefined}
                        onDropItem={canEdit && canDrag ? handleDrop : undefined}
                        getBadge={sharedBadge}
                    />

                    <GroupBoxListCard
                        title="Boxes"
                        items={boxes}
                        getId={b => b.id}
                        getName={b => b.name}
                        getSubtitle={b => `${b.cardCount} cards`}
                        onNavigate={b => navigate(`/box/${b.id}`)}
                        onDelete={canEdit ? b => void deleteBox(b) : undefined}
                        deletingId={deletingBoxId}
                        emptyMessage="No boxes found."
                        onMove={canEdit ? b => setMovingItem(boxItem(b)) : undefined}
                        getDragItem={canEdit && canDrag ? boxItem : undefined}
                        getBadge={sharedBadge}
                    />

                </div>
            </div>
        </div>

        {movingItem && activeGroup && (
            <MoveToGroupDialog
                item={movingItem}
                entityId={activeGroup.entityId}
                onClose={() => setMovingItem(undefined)}
                onMoved={() => { if (id) void loadGroup(id).catch(() => {}) }}
            />
        )}
        </>
    )
}