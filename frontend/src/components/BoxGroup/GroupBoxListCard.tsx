interface EntityListProps<T> {
    title: string
    items: T[]
    getId: (item: T) => string
    getName: (item: T) => string
    getSubtitle: (item: T) => string
    onNavigate: (item: T) => void
    onDelete: (item: T) => void
    deletingId?: string
    emptyMessage?: string
    className?: string
}

export default function GroupBoxListCard<T>({
    title, items, getId, getName, getSubtitle,
    onNavigate, onDelete, deletingId, emptyMessage, className
}: EntityListProps<T>) {
    return (
        <div className={`grid min-w-0 grid-cols-1 content-start gap-4 ${className ?? ''}`}>
            <h2 className="mb-1 ml-3 text-lg font-bold uppercase tracking-wide text-fg-muted">{title}</h2>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 content-start gap-4">
                    {items.map(item => (
                        <div
                            key={getId(item)}
                            onClick={() => onNavigate(item)}
                            className="flex w-full items-center justify-between rounded border p-4 shadow-sm transition cursor-pointer hover:bg-surface-sunken"
                        >
                            <div>
                                <h2 className="text-lg font-semibold">{getName(item)}</h2>
                                <p className="text-sm text-fg-subtle">{getSubtitle(item)}</p>
                            </div>
                            <div className="flex self-stretch items-center">
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); onDelete(item) }}
                                    aria-label={`Delete ${getName(item)}`}
                                    disabled={deletingId === getId(item)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded border border-danger-line bg-danger-soft text-2xl font-bold leading-none text-danger transition hover:bg-danger-soft-strong hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-fg-subtle">{emptyMessage ?? 'No items found.'}</p>}
                </div>
            </div>
        </div>
    )
}