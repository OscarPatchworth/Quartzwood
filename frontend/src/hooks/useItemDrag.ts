import { useState, type DragEvent } from "react"
import { DRAG_TYPE, readDraggedItem, type MovableItem } from "../utils/moveBoxGroup"

// The item being dragged FROM THIS window (undefined when the drag started in another window, or nothing is dragged).
// Lets a drop target skip highlighting itself, or the group the item is already in
let draggingHere: MovableItem | undefined

// Makes an element draggable as `item`. Spread dragProps onto it; isDragging is true while it's being dragged
export function useItemDrag(item: MovableItem | undefined) {
    const [isDragging, setIsDragging] = useState(false)
    if (!item) return { isDragging: false, dragProps: {} }

    return {
        isDragging,
        dragProps: {
            draggable: true,
            onDragStart: (event: DragEvent) => {
                // The data travels with the drag, so a drop in ANOTHER window of the site can read it too
                event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(item))
                event.dataTransfer.effectAllowed = "move"
                draggingHere = item
                setIsDragging(true)
            },
            onDragEnd: () => {
                draggingHere = undefined
                setIsDragging(false)
            },
        },
    }
}

// Makes an element a drop target for group `groupId`: dropping a dragged group or box calls onDrop.
// Spread dropProps onto it; isOver is true while something droppable is held over it
export function useItemDrop(groupId: string | undefined, onDrop: (item: MovableItem, toGroupId: string) => void) {
    const [isOver, setIsOver] = useState(false)
    if (!groupId) return { isOver: false, dropProps: {} }

    // Dropping a group on itself, or anything on the group it's already in, would do nothing
    const isPointless = (item: MovableItem | undefined) => item !== undefined && (item.id === groupId || item.fromGroupId === groupId)

    return {
        isOver,
        dropProps: {
            onDragOver: (event: DragEvent) => {
                // Only Quartzwood rows (not files or text), and the data itself can't be read until the drop
                if (!event.dataTransfer.types.includes(DRAG_TYPE) || isPointless(draggingHere)) return
                event.preventDefault()   // = "can drop here"
                event.dataTransfer.dropEffect = "move"
                setIsOver(true)
            },
            onDragLeave: (event: DragEvent) => {
                // Moving onto a child element also fires dragleave: only count actually leaving
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOver(false)
            },
            onDrop: (event: DragEvent) => {
                event.preventDefault()
                setIsOver(false)
                const item = readDraggedItem(event.dataTransfer)
                if (item && !isPointless(item)) onDrop(item, groupId)
            },
        },
    }
}
