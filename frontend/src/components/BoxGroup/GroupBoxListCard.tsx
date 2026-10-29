import { useItemDrag, useItemDrop } from '../../hooks/useItemDrag'
import type { MovableItem } from '../../utils/moveBoxGroup'

interface EntityListProps<T> {
    title: string
    items: T[]
    getId: (item: T) => string
    getName: (item: T) => string
    getSubtitle: (item: T) => string
    onNavigate: (item: T) => void
    // Shows a × (delete) button on each row
    onDelete?: (item: T) => void
    deletingId?: string
    emptyMessage?: string
    className?: string
    // Shows a Move button on each row
    onMove?: (item: T) => void
    // Rows can be dragged (leave out on small screens)
    getDragItem?: (item: T) => MovableItem
    // Rows are groups that things can be dropped into: called with what was dropped and the row's id
    onDropItem?: (dropped: MovableItem, toGroupId: string) => void
    // A small label after the name, e.g. "Unlisted"
    getBadge?: (item: T) => string | undefined
}

export default function GroupBoxListCard<T>({
    title, items, getId, getName, getSubtitle,
    onNavigate, onDelete, deletingId, emptyMessage, className,
    onMove, getDragItem, onDropItem, getBadge
}: EntityListProps<T>) {
    return (
        <div className={`grid min-w-0 grid-cols-1 content-start gap-4 ${className ?? ''}`}>
            <h2 className="mb-1 ml-3 eyebrow text-sm text-fg-muted">{title}</h2>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 content-start gap-4">
                    {items.map(item => (
                        <ListRow
                            key={getId(item)}
                            id={getId(item)}
                            name={getName(item)}
                            subtitle={getSubtitle(item)}
                            onNavigate={() => onNavigate(item)}
                            onDelete={onDelete && (() => onDelete(item))}
                            isDeleting={deletingId === getId(item)}
                            onMove={onMove && (() => onMove(item))}
                            dragItem={getDragItem?.(item)}
                            onDropItem={onDropItem}
                            badge={getBadge?.(item)}
                        />
                    ))}
                    {items.length === 0 && <p className="text-fg-subtle">{emptyMessage ?? 'No items found.'}</p>}
                </div>
            </div>
        </div>
    )
}

interface ListRowProps {
    id: string
    name: string
    subtitle: string
    onNavigate: () => void
    onDelete?: () => void
    isDeleting: boolean
    onMove?: () => void
    dragItem?: MovableItem
    onDropItem?: (dropped: MovableItem, toGroupId: string) => void
    badge?: string
}

// One row: click to open, drag to move (when allowed), drop onto (group rows), Move and Delete buttons
function ListRow({ id, name, subtitle, onNavigate, onDelete, isDeleting, onMove, dragItem, onDropItem, badge }: ListRowProps) {
    const { isDragging, dragProps } = useItemDrag(dragItem)
    const { isOver, dropProps } = useItemDrop(onDropItem && id, (dropped, toGroupId) => onDropItem?.(dropped, toGroupId))

    return (
        <div
            {...dragProps}
            {...dropProps}
            onClick={onNavigate}
            className={`flex w-full items-center justify-between gap-3 rounded border p-4 shadow-sm transition cursor-pointer ${
                isOver
                    ? "border-accent-line bg-accent-soft ring-2 ring-accent-line/30"
                    : "border-boxgroup-line bg-boxgroup text-boxgroup-fg hover:bg-boxgroup-hover"
            } ${dragItem ? "active:cursor-grabbing" : ""} ${isDragging ? "opacity-50" : ""}`}
        >
            <div className="flex min-w-0 items-center gap-3">
                {/* Grip dots: a hint that the row can be dragged */}
                {dragItem && (
                    <svg viewBox="0 0 10 16" aria-hidden="true" className="h-4 w-2.5 shrink-0 cursor-grab fill-boxgroup-fg-muted">
                        {[2, 8, 14].flatMap(y => [<circle key={`a${y}`} cx="2" cy={y} r="1.5" />, <circle key={`b${y}`} cx="8" cy={y} r="1.5" />])}
                    </svg>
                )}
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-heading text-boxgroup-fg">{name}</h2>
                        {badge && (
                            <span className="shrink-0 rounded-full border border-boxgroup-fg-muted/50 px-2 text-xs font-semibold text-boxgroup-fg-muted">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-boxgroup-fg-muted">{isOver ? `Move into ${name}` : subtitle}</p>
                </div>
            </div>
            <div className="flex shrink-0 self-stretch items-center gap-2">
                {onMove && (
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onMove() }}
                        aria-label={`Move ${name}`}
                        className="inline-flex h-9 items-center justify-center rounded border border-button-line bg-button px-3 text-sm font-semibold text-button-fg transition hover:bg-button-hover"
                    >
                        Move
                    </button>
                )}
                {onDelete && (
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onDelete() }}
                        aria-label={`Delete ${name}`}
                        disabled={isDeleting}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-danger-line bg-danger-soft text-title leading-none text-danger transition hover:bg-danger-soft-strong hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    )
}
