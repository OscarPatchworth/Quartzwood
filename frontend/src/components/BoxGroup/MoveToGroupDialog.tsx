import { useEffect, useState, type FormEvent } from "react"
import { getApiGroupsByEntityByEntityId, type GroupDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { treeOrder } from "../../utils/groupTree"
import { moveItem, type MovableItem } from "../../utils/moveBoxGroup"

interface MoveToGroupDialogProps {
    item: MovableItem
    // Whose groups to list: a group or box stays in its own Entity
    entityId: string
    onClose: () => void
    // Called after the move, so the page can reload
    onMoved: () => void
}

// "Move to...": every group as a tree, pick one, confirm. Works on any screen size (dragging needs a mouse)
export function MoveToGroupDialog({ item, entityId, onClose, onMoved }: MoveToGroupDialogProps) {
    const [groups, setGroups] = useState<{ group: GroupDto, depth: number }[]>()
    const [targetId, setTargetId] = useState<string>()
    const [isMoving, setIsMoving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    useEffect(() => {
        getApiGroupsByEntityByEntityId({ path: { entityId } })
            .then(res => setGroups(treeOrder(res.data)))
            .catch(error => setErrorMessage(getErrorMessage(error, "Could not load your groups.")))
    }, [entityId])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !isMoving) onClose() }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [isMoving, onClose])

    // A group can't go inside itself or anything inside it
    const blockedIds = new Set<string>()
    if (item.kind === "group") {
        blockedIds.add(item.id)
        for (const { group } of groups ?? [])
            if (group.parentGroupId && blockedIds.has(group.parentGroupId)) blockedIds.add(group.id)
    }
    const target = groups?.find(({ group }) => group.id === targetId)?.group
    const nameOf = (group: GroupDto) => group.parentGroupId === null ? "My Collection" : group.name

    async function move(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!target) return

        setIsMoving(true)
        setErrorMessage(undefined)
        try {
            await moveItem(item, target.id)
            onMoved()
            onClose()
        } catch (error) {
            setErrorMessage(getErrorMessage(error, `Could not move ${item.name}. Please try again.`))
            setIsMoving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
            onMouseDown={() => !isMoving && onClose()}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="move-item-title"
                onMouseDown={event => event.stopPropagation()}
                onSubmit={move}
                className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-panel p-6 shadow-xl"
            >
                <h2 id="move-item-title" className="mb-3 truncate text-heading text-fg-heading">Move {item.name} to...</h2>

                <ul className="min-h-40 overflow-y-auto pr-1">
                    {!groups && !errorMessage && <li className="py-6 text-center text-sm text-fg-subtle">Loading groups...</li>}
                    {groups?.map(({ group, depth }) => {
                        const isCurrent = group.id === item.fromGroupId
                        const isBlocked = blockedIds.has(group.id)
                        const isTarget = group.id === targetId
                        return (
                            <li key={group.id}>
                                <button
                                    type="button"
                                    aria-pressed={isTarget}
                                    disabled={isCurrent || isBlocked}
                                    onClick={() => setTargetId(group.id)}
                                    // Indented under its parent, like a folder tree
                                    style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                                    className={`flex w-full items-center justify-between gap-2 rounded-md py-2 pr-3 text-left text-sm transition disabled:cursor-not-allowed disabled:text-fg-subtle ${
                                        isTarget ? "bg-accent-soft font-semibold text-accent-ink" : "text-fg hover:bg-surface-muted disabled:hover:bg-transparent"
                                    }`}
                                >
                                    <span className="truncate">{nameOf(group)}</span>
                                    {isCurrent && <span className="shrink-0 text-xs">Current</span>}
                                    {isBlocked && group.id === item.id && <span className="shrink-0 text-xs">This group</span>}
                                </button>
                            </li>
                        )
                    })}
                </ul>

                {errorMessage && <p role="alert" className="mt-3 text-sm text-danger">{errorMessage}</p>}

                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        disabled={isMoving}
                        onClick={onClose}
                        className="rounded-md border border-button-line bg-button px-3 py-2 text-sm font-medium text-button-fg hover:bg-button-hover disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isMoving || !target}
                        className="max-w-72 truncate rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isMoving ? "Moving..." : target ? `Move to ${nameOf(target)}` : "Move"}
                    </button>
                </div>
            </form>
        </div>
    )
}
