import { useEffect, useState } from "react"
import { getApiBoxesByGroupByGroupId, getApiGroupsByEntityByEntityId, type BoxDto, type GroupDto } from "../../interfaces/generated.ts"
import { treeOrder } from "../../utils/groupTree"

export interface Location {
    // A group includes every group inside it
    groupId?: string
    // A box inside the chosen group
    boxId?: string
}

interface LocationPickerProps {
    entityId: string
    value: Location
    onChange: (next: Location) => void
}

const selectClassName = "rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 shadow-sm"

// Two dropdowns: a group (the whole tree, each group indented under its parent), then a box in that group
export function LocationPicker({ entityId, value, onChange }: LocationPickerProps) {
    const [groups, setGroups] = useState<{ group: GroupDto, depth: number }[]>([])
    const [boxes, setBoxes] = useState<BoxDto[]>([])

    useEffect(() => {
        getApiGroupsByEntityByEntityId({ path: { entityId } })
            .then(res => setGroups(treeOrder(res.data)))
            .catch(() => setGroups([]))
    }, [entityId])

    // The boxes directly in the chosen group
    useEffect(() => {
        if (!value.groupId) { setBoxes([]); return }
        let isCurrent = true
        getApiBoxesByGroupByGroupId({ path: { groupId: value.groupId } })
            .then(res => { if (isCurrent) setBoxes([...res.data].sort((a, b) => a.name.localeCompare(b.name))) })
            .catch(() => { if (isCurrent) setBoxes([]) })
        return () => { isCurrent = false }
    }, [value.groupId])

    return (
        <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Group" className={selectClassName} value={value.groupId ?? ""}
                // A new group clears the box: the old box is in a different group
                onChange={event => onChange({ groupId: event.target.value || undefined })}>
                <option value="">Whole collection</option>
                {groups.map(({ group, depth }) => (
                    // Non-breaking spaces: normal spaces at the start of an <option> are collapsed
                    <option key={group.id} value={group.id}>{"  ".repeat(depth)}{group.name}</option>
                ))}
            </select>
            {value.groupId && boxes.length > 0 && (
                <select aria-label="Box" className={selectClassName} value={value.boxId ?? ""}
                    onChange={event => onChange({ ...value, boxId: event.target.value || undefined })}>
                    <option value="">Every box in it</option>
                    {boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}
                </select>
            )}
        </div>
    )
}
