import { useEffect, useState } from "react"
import { postApiCardsBulkDelete } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import type { useCardSelection } from "../../hooks/useCardSelection"
import { BulkEditDialog } from "./BulkEditDialog"
import { MoveDialog } from "./MoveDialog"

interface BulkActionBarProps {
    // What useCardSelection returned on the page
    selection: ReturnType<typeof useCardSelection>
    // Called after cards were changed, moved or deleted, so the page can reload them
    onChanged: () => Promise<void>
    // The box the page shows (it can't be picked as a move target); none on pages spanning several boxes
    currentBoxId?: string
}

const buttonClassName = "rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"

// Floats at the bottom of the screen while in select mode: "N cards selected" + the mass actions
export function BulkActionBar({ selection, onChanged, currentBoxId }: BulkActionBarProps) {
    // One value rather than a flag per dialog: only one can ever be open
    const [openDialog, setOpenDialog] = useState<"edit" | "move">()
    const [isDeleting, setIsDeleting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    const count = selection.selectedIds.length
    const countLabel = count === 1 ? "1 card" : `${count} cards`
    const { isSelecting, stop } = selection

    // Escape leaves select mode (unless a dialog is open: then Escape is for the dialog)
    useEffect(() => {
        if (!isSelecting || openDialog) return
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") stop()
        }
        window.addEventListener("keydown", onKeyDown)
        // Cleanup: remove the listener when the bar goes away or the dependencies change
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isSelecting, openDialog, stop])

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
                className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 shadow-lg"
            >
                <span className="min-w-28 text-sm font-semibold text-fg" aria-live="polite">
                    {count === 0 ? "Select cards" : `${countLabel} selected`}
                </span>

                <button
                    type="button"
                    className={`${buttonClassName} text-fg-muted hover:bg-surface-sunken`}
                    onClick={selection.allSelected ? selection.clear : selection.selectAll}
                >
                    {selection.allSelected ? "Clear" : "Select all"}
                </button>

                <span className="h-6 w-px bg-surface-strong" aria-hidden="true" />

                <button
                    type="button"
                    disabled={count === 0 || isDeleting}
                    className={`${buttonClassName} border border-accent-line/40 bg-accent-soft text-accent-ink hover:bg-accent-soft`}
                    onClick={() => setOpenDialog("edit")}
                >
                    Edit...
                </button>
                <button
                    type="button"
                    disabled={count === 0 || isDeleting}
                    className={`${buttonClassName} border border-success-line bg-success-soft text-success hover:bg-success-soft-strong`}
                    onClick={() => setOpenDialog("move")}
                >
                    Move...
                </button>
                <button
                    type="button"
                    disabled={count === 0 || isDeleting}
                    className={`${buttonClassName} border border-danger-line bg-danger-soft text-danger hover:bg-danger-soft-strong`}
                    onClick={deleteSelected}
                >
                    {isDeleting ? "Deleting..." : "Delete"}
                </button>

                <span className="h-6 w-px bg-surface-strong" aria-hidden="true" />

                <button type="button" className={`${buttonClassName} text-fg-muted hover:bg-surface-sunken`} onClick={stop}>
                    Done
                </button>

                {errorMessage && <p role="alert" className="w-full text-sm text-danger">{errorMessage}</p>}
            </div>

            {openDialog === "edit" && (
                <BulkEditDialog
                    cardIds={selection.selectedIds}
                    onClose={() => setOpenDialog(undefined)}
                    onSaved={onChanged}
                />
            )}
            {openDialog === "move" && (
                <MoveDialog
                    cardIds={selection.selectedIds}
                    currentBoxId={currentBoxId}
                    onClose={() => setOpenDialog(undefined)}
                    onMoved={onChanged}
                />
            )}
        </>
    )
}
