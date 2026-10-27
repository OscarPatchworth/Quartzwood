import { putApiBoxesById, putApiGroupsById } from "../interfaces/generated.ts"

// A group or box being moved (dragged, or picked in the Move dialog)
export interface MovableItem {
    kind: "group" | "box"
    id: string
    name: string
    // The group it's in now
    fromGroupId: string
}

// The drag data type: only Quartzwood rows carry it, so dropped files or text are ignored
export const DRAG_TYPE = "application/x-quartzwood-item"

// Tells every other open Quartzwood tab/window that something moved, so their pages can reload
const channel = typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel("quartzwood-moves")

export interface MoveMessage {
    item: MovableItem
    toGroupId: string
}

// Moves a group (into another group) or a box (into a group). Throws the server's message on failure,
// e.g. "A group can't be moved inside itself."
export async function moveItem(item: MovableItem, toGroupId: string) {
    if (item.kind === "group") {
        // null = leave unchanged
        await putApiGroupsById({ path: { id: item.id }, body: { name: null, description: null, parentGroupId: toGroupId } })
    } else {
        await putApiBoxesById({ path: { id: item.id }, body: { name: null, groupId: toGroupId } })
    }
    channel?.postMessage({ item, toGroupId } satisfies MoveMessage)
}

// Calls onMove whenever ANOTHER tab/window moves something. Returns the unsubscribe function (for useEffect)
export function onMoveElsewhere(onMove: (message: MoveMessage) => void) {
    if (!channel) return () => {}
    const listener = (event: MessageEvent<MoveMessage>) => onMove(event.data)
    channel.addEventListener("message", listener)
    return () => channel.removeEventListener("message", listener)
}

// Reads the dragged item from a drop; undefined if it isn't a Quartzwood row
export function readDraggedItem(dataTransfer: DataTransfer): MovableItem | undefined {
    try {
        const raw = dataTransfer.getData(DRAG_TYPE)
        return raw ? JSON.parse(raw) as MovableItem : undefined
    } catch {
        return undefined
    }
}
