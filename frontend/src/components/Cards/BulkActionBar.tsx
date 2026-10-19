import { useEffect, useState } from "react"
import { postApiCardsBulkDelete } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import type { useCardSelection } from "../../hooks/useCardSelection"
import { BulkEditDialog } from "./BulkEditDialog"

interface BulkActionBarProps {
    // What useCardSelection returned on the page
    selection: ReturnType<typeof useCardSelection>
    // Called after cards were changed or deleted, so the page can reload them
    onChanged: () => Promise<void>
}

const buttonClassName = "rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"

// Floats at the bottom of the screen while in select mode: "N cards selected" + the mass actions
export function BulkActionBar({ selection, onChanged }: BulkActionBarProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    const count = selection.selectedIds.length
    const countLabel = count === 1 ? "1 card" : `${count} cards`
    const { isSelecting, stop } = selection

    // Escape leaves select mode (unless the edit dialog is open: then Escape is for the dialog)
    useEffect(() => {
        if (!isSelecting || isEditing) return
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") stop()
        }
        window.addEventListener("keydown", onKeyDown)
        // Cleanup: remove the listener when the bar goes away or the dependencies change
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isSelecting, isEditing, stop])

    if (!isSelecting) return null

    async function deleteSelected() {
        if (!window.confirm(`Delete ${countLabel}? This cannot be undone.`)) return

        setIsDeleting(true)
        setErrorMessage(undefined)
        try {
            await postApiCardsBulkDelete({ body: { cardIds: selection.selectedIds } })
            await onChanged()
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Could not delete the cards. Please try again."))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <div
                role="toolbar"
                aria-label="Selected cards"
                className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-lg"
            >
                <span className="min-w-28 text-sm font-semibold text-slate-800" aria-live="polite">
                    {count === 0 ? "Select cards" : `${countLabel} selected`}
                </span>

                <button
                    type="button"
                    className={`${buttonClassName} text-slate-700 hover:bg-slate-100`}
                    onClick={selection.allSelected ? selection.clear : selection.selectAll}
                >
                    {selection.allSelected ? "Clear" : "Select all"}
                </button>

                <span className="h-6 w-px bg-slate-200" aria-hidden="true" />

                <button
                    type="button"
                    disabled={count === 0 || isDeleting}
                    className={`${buttonClassName} border border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100`}
                    onClick={() => setIsEditing(true)}
                >
                    Edit...
                </button>
                <button
                    type="button"
                    disabled={count === 0 || isDeleting}
                    className={`${buttonClassName} border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100`}
                    onClick={deleteSelected}
                >
                    {isDeleting ? "Deleting..." : "Delete"}
                </button>

                <span className="h-6 w-px bg-slate-200" aria-hidden="true" />

                <button type="button" className={`${buttonClassName} text-slate-700 hover:bg-slate-100`} onClick={stop}>
                    Done
                </button>

                {errorMessage && <p role="alert" className="w-full text-sm text-rose-700">{errorMessage}</p>}
            </div>

            {isEditing && (
                <BulkEditDialog
                    cardIds={selection.selectedIds}
                    onClose={() => setIsEditing(false)}
                    onSaved={onChanged}
                />
            )}
        </>
    )
}
