import { useState, type FormEvent } from "react"
import { getApiBoxesSearch, postApiCardsBulkMove, type BoxSearchResultDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch"
import { SearchInput } from "../misc/SearchInput"

interface MoveDialogProps {
    cardIds: string[]
    // The box the cards are in now (shown, but can't be picked); none when they come from several boxes
    currentBoxId?: string
    onClose: () => void
    // Called after the cards were moved, so the page can reload
    onMoved: () => Promise<void>
}

// "Move to...": search your boxes, pick one, confirm. Boxes in Entities you own come first;
// boxes in Entities shared with you are listed after them, tinted, with the Entity's name
export function MoveDialog({ cardIds, currentBoxId, onClose, onMoved }: MoveDialogProps) {
    const [text, setText] = useState("")
    const [target, setTarget] = useState<BoxSearchResultDto>()
    const [isMoving, setIsMoving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    // minLength 0: an empty search lists every box, so the list is there as soon as the dialog opens
    const { result: boxes, errorMessage: searchError, isSearching } = useDebouncedSearch(
        text,
        async query => (await getApiBoxesSearch({ query: { q: query } })).data,
        { minLength: 0, delayMs: 200 },
    )

    const countLabel = cardIds.length === 1 ? "1 card" : `${cardIds.length} cards`
    const owned = boxes?.filter(box => box.isOwned) ?? []
    const shared = boxes?.filter(box => !box.isOwned) ?? []

    async function move(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!target) return

        setIsMoving(true)
        setErrorMessage(undefined)
        try {
            await postApiCardsBulkMove({ body: { cardIds, boxId: target.id } })
            await onMoved()
            onClose()
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Could not move the cards. Please try again."))
            setIsMoving(false)
        }
    }

    function boxButton(box: BoxSearchResultDto) {
        const isCurrent = box.id === currentBoxId
        const isTarget = box.id === target?.id
        // Breadcrumbs: the groups from the root down. Shared boxes start with their Entity's name,
        // since their root group is just "Collection" like yours
        const path = [...(box.isOwned ? [] : [box.entityName]), ...box.groupPath.map(step => step.name)].join(" › ")

        return (
            <li key={box.id}>
                <button
                    type="button"
                    disabled={isCurrent}
                    aria-pressed={isTarget}
                    onClick={() => setTarget(box)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isTarget
                            ? "border-sky-700 bg-sky-50 ring-2 ring-sky-700/30"
                            : box.isOwned
                                ? "border-slate-200 bg-white hover:bg-slate-50"
                                : "border-amber-200 bg-amber-50 hover:bg-amber-100"
                    }`}
                >
                    <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-900">{box.name}</span>
                        {isCurrent && <span className="shrink-0 text-xs text-slate-500">Current box</span>}
                        {!isCurrent && !box.isOwned && (
                            <span className="shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900">Shared</span>
                        )}
                    </span>
                    <span className="block truncate border-t border-slate-200/70 pt-0.5 text-xs text-slate-500">{path}</span>
                </button>
            </li>
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onMouseDown={() => !isMoving && onClose()}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="move-title"
                onMouseDown={event => event.stopPropagation()}
                onSubmit={move}
                className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-white p-6 shadow-xl"
            >
                <h2 id="move-title" className="mb-3 text-lg font-semibold text-slate-900">Move {countLabel} to...</h2>

                <SearchInput
                    id="move-box-search"
                    label="Search boxes"
                    placeholder="Search boxes or groups"
                    value={text}
                    onChange={setText}
                    isSearching={isSearching}
                    autoFocus
                />

                <div className="mt-3 min-h-40 overflow-y-auto pr-1" aria-live="polite">
                    {searchError && <p role="alert" className="text-sm text-rose-700">{searchError}</p>}
                    {boxes && boxes.length === 0 && (
                        <p className="py-6 text-center text-sm text-slate-500">No boxes match "{text.trim()}".</p>
                    )}
                    {owned.length > 0 && (
                        <>
                            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Your boxes</h3>
                            <ul className="flex flex-col gap-1.5">{owned.map(boxButton)}</ul>
                        </>
                    )}
                    {shared.length > 0 && (
                        <>
                            <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-amber-700">Shared with you</h3>
                            <ul className="flex flex-col gap-1.5">{shared.map(boxButton)}</ul>
                        </>
                    )}
                </div>

                {errorMessage && <p role="alert" className="mt-3 text-sm text-rose-700">{errorMessage}</p>}

                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        disabled={isMoving}
                        onClick={onClose}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isMoving || !target}
                        className="max-w-60 truncate rounded-md bg-sky-800 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isMoving ? "Moving..." : target ? `Move ${countLabel} to ${target.name}` : `Move ${countLabel}`}
                    </button>
                </div>
            </form>
        </div>
    )
}
