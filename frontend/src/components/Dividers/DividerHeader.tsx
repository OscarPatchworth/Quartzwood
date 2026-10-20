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
}

const iconButton = "inline-flex size-8 items-center justify-center rounded border text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-40"

// The heading above a divider's cards: double-click the name to rename, arrows to move it, × to delete
export function DividerHeader({ divider, isFirst, isLast, onRename, onMove, onDelete, disabled }: DividerHeaderProps) {
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
        <div className="mb-3 mt-8 flex items-center gap-3 border-b-2 border-slate-300 pb-2">
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
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-lg font-bold outline-none ring-2 ring-blue-200"
                />
            ) : (
                <h2 className="cursor-text text-lg font-bold text-slate-800" onDoubleClick={startEdit} title="Double-click to rename">
                    {divider.name}
                </h2>
            )}
            <span className="text-sm text-slate-500">{count} {count === 1 ? "card" : "cards"}</span>

            <div className="ml-auto flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onMove(-1)}
                    disabled={disabled || isFirst}
                    aria-label={`Move ${divider.name} towards the front`}
                    title="Move towards the front"
                    className={`${iconButton} border-slate-300 bg-white hover:bg-slate-100`}
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
                    className={`${iconButton} border-slate-300 bg-white hover:bg-slate-100`}
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
                    className={`${iconButton} border-red-200 bg-red-50 text-xl font-bold leading-none text-red-600 hover:bg-red-100 hover:text-red-700`}
                >
                    ×
                </button>
            </div>
        </div>
    )
}
