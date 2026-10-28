import type { GroupDto } from '../../interfaces/generated.ts'
import { useItemDrop } from '../../hooks/useItemDrag'
import type { MovableItem } from '../../utils/moveBoxGroup'

interface ParentGroupBannerProps {
    parentGroup: GroupDto
    onNavigate: () => void
    // Dropping a dragged group or box here moves it up into the parent (leave out to turn dropping off)
    onDropItem?: (dropped: MovableItem, toGroupId: string) => void
}

// "Inside <parent>": the row above a group's lists that goes up one level
export function ParentGroupBanner({ parentGroup, onNavigate, onDropItem }: ParentGroupBannerProps) {
    const { isOver, dropProps } = useItemDrop(onDropItem && parentGroup.id, (dropped, toGroupId) => onDropItem?.(dropped, toGroupId))
    // The root group is the user's collection
    const name = parentGroup.parentGroupId === null ? 'My Collection' : parentGroup.name

    return (
        <button
            type="button"
            {...dropProps}
            onClick={onNavigate}
            className={`flex w-full items-center gap-3 rounded border border-dashed px-4 py-3 text-left transition md:col-span-2 ${
                isOver
                    ? "border-accent-line bg-accent-soft ring-2 ring-accent-line/30"
                    : "border-boxgroup-line bg-boxgroup-parent text-boxgroup-fg hover:bg-boxgroup-hover"
            }`}
        >
            <span className="text-heading text-boxgroup-fg-muted" aria-hidden="true">↰</span>
            <span className="min-w-0">
                <span className="block eyebrow text-xs text-boxgroup-fg-muted">{isOver ? 'Move up into' : 'Inside'}</span>
                <span className="block truncate text-heading">{name}</span>
            </span>
        </button>
    )
}
