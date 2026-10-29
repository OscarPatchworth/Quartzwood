import { useState } from "react"
import type { DividerDto } from "../../interfaces/generated.ts"

interface DividerHeaderProps {
    divider: DividerDto
    isFirst: boolean
    isLast: boolean
    // Each resolves once the server has answered; the box page shows any error
    onRename: (name: string) => Promise<void>
    onMove: (direction: -1 | 1) => void
    onDelete: () => void
    disabled?: boolean
    // Viewing someone else's box: just the name and count, no rename/move/delete
    readOnly?: boolean
}

const iconButton = "inline-flex size-8 items-center justify-center rounded border text-fg-muted transition disabled:cursor-not-allowed disabled:opacity-40"

// The heading above a divider's cards: double-click the name to rename, arrows to move it, × to delete
export function DividerHeader({ divider, isFirst, isLast, onRename, onMove, onDelete, disabled, readOnly = false }: DividerHeaderProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draftName, setDraftName] = useState(divider.name)

    function startEdit() {
        setDraftName(divider.name)
        setIsEditing(true)
    }

    async function save() {
        const nextName = draftName.trim()
        setIsEditing(false)
        if (!nextName || nextName === divider.name) return
        await onRename(nextName)
    }

    const count = Number(divider.cardCount)

    return (
        <div className="mb-3 mt-8 flex items-center gap-3 border-b-2 border-line-strong pb-2">
            {isEditing ? (
                <input
                    autoFocus
                    maxLength={100}
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    onBlur={() => void save()}
                    onKeyDown={e => {
                        if (e.key === "Enter") { e.preventDefault(); void save() }
                        if (e.key === "Escape") setIsEditing(false)
                    }}
                    aria-label="Divider name"
                    className="rounded border border-input-line bg-input px-2 py-0.5 font-display text-heading outline-none ring-2 ring-accent-line/40"
                />
            ) : (
                <h2
                    className={`text-heading text-fg-heading ${readOnly ? "" : "cursor-text"}`}
                    onDoubleClick={readOnly ? undefined : startEdit}
                    title={readOnly ? undefined : "Double-click to rename"}
                >
                    {divider.name}
                </h2>
            )}
            <span className="text-sm text-fg-subtle">{count} {count === 1 ? "card" : "cards"}</span>

            {!readOnly && <div className="ml-auto flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onMove(-1)}
                    disabled={disabled || isFirst}
                    aria-label={`Move ${divider.name} towards the front`}
                    title="Move towards the front"
                    className={`${iconButton} border-button-line bg-button hover:bg-button-hover`}
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                        <path d="M5 12l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => onMove(1)}
                    disabled={disabled || isLast}
                    aria-label={`Move ${divider.name} towards the back`}
                    title="Move towards the back"
                    className={`${iconButton} border-button-line bg-button hover:bg-button-hover`}
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                        <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={disabled}
                    aria-label={`Delete divider ${divider.name}`}
                    title="Delete divider (its cards stay in the box)"
                    className={`${iconButton} border-danger-line bg-danger-soft text-xl font-bold leading-none text-danger hover:bg-danger-soft-strong hover:text-danger`}
                >
                    ×
                </button>
            </div>}
        </div>
    )
}
