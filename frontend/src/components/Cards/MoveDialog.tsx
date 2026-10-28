import { useEffect, useState, type FormEvent } from "react"
import {
    getApiBoxesSearch,
    getApiDividersByBoxByBoxId,
    postApiCardsBulkMove,
    type BoxSearchResultDto,
    type DividerDto,
} from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch"
import { SearchInput } from "../misc/SearchInput"

interface MoveDialogProps {
    cardIds: string[]
    // The box the cards are in now; none when they come from several boxes. If it has dividers the dialog
    // starts on it, since moving cards between its dividers is the usual reason to open it from a box page
    currentBoxId?: string
    onClose: () => void
    // Called after the cards were moved, so the page can reload
    onMoved: (box: BoxSearchResultDto) => Promise<void>
}

// "Move to...": search your boxes, pick one (and, if it has dividers, which one to go behind), confirm.
// Boxes in Entities you own come first; boxes in Entities shared with you are listed after them, tinted,
// with the Entity's name
export function MoveDialog({ cardIds, currentBoxId, onClose, onMoved }: MoveDialogProps) {
    const [text, setText] = useState("")
    const [chosenBox, setChosenBox] = useState<BoxSearchResultDto>()
    // The divider picked, and for which box: picking another box goes back to "not behind a divider"
    const [dividerChoice, setDividerChoice] = useState<{ boxId: string, dividerId: string | null }>()
    // Each box's dividers, loaded the first time it's picked (or, for the current box, straight away)
    const [dividersByBox, setDividersByBox] = useState<Record<string, DividerDto[]>>({})
    const [dividerError, setDividerError] = useState<string>()
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

    // Until another box is picked, a current box with dividers is the target
    const currentHasDividers = currentBoxId !== undefined && (dividersByBox[currentBoxId]?.length ?? 0) > 0
    const target = chosenBox ?? (currentHasDividers ? boxes?.find(box => box.id === currentBoxId) : undefined)
    const targetDividers = target ? dividersByBox[target.id] : undefined
    const dividerId = dividerChoice && dividerChoice.boxId === target?.id ? dividerChoice.dividerId : null
    const dividerName = targetDividers?.find(d => d.id === dividerId)?.name
    // With no dividers to choose between, "moving" cards to the box they're in would change nothing
    const isAlreadyThere = target !== undefined && target.id === currentBoxId && targetDividers?.length === 0

    const boxToLoad = currentBoxId && !(currentBoxId in dividersByBox) ? currentBoxId
        : target && !(target.id in dividersByBox) ? target.id
        : undefined
    useEffect(() => {
        if (!boxToLoad) return
        let isCurrent = true
        getApiDividersByBoxByBoxId({ path: { boxId: boxToLoad } })
            .then(res => { if (isCurrent) setDividersByBox(current => ({ ...current, [boxToLoad]: res.data })) })
            .catch(error => {
                if (!isCurrent) return
                setDividerError(getErrorMessage(error, "Could not load the box's dividers."))
                // Treated as none, so the cards can still be moved into the box itself
                setDividersByBox(current => ({ ...current, [boxToLoad]: [] }))
            })
        return () => { isCurrent = false }
    }, [boxToLoad])

    async function move(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!target || isAlreadyThere) return

        setIsMoving(true)
        setErrorMessage(undefined)
        try {
            await postApiCardsBulkMove({ body: { cardIds, boxId: target.id, dividerId } })
            await onMoved(target)
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
                    aria-pressed={isTarget}
                    onClick={() => setChosenBox(box)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition ${
                        isTarget
                            ? "border-accent-line bg-accent-soft ring-2 ring-accent-line/30"
                            : box.isOwned
                                ? "border-line bg-panel hover:bg-surface-muted"
                                : "border-warning-line bg-warning-soft hover:bg-warning-soft-strong"
                    }`}
                >
                    <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-fg">{box.name}</span>
                        {isCurrent && <span className="shrink-0 text-xs text-fg-subtle">Current box</span>}
                        {!isCurrent && !box.isOwned && (
                            <span className="shrink-0 rounded bg-warning-soft-strong px-1.5 py-0.5 text-xs font-medium text-warning">Shared</span>
                        )}
                    </span>
                    <span className="block truncate border-t border-line/70 pt-0.5 text-xs text-fg-subtle">{path}</span>
                </button>
            </li>
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
            onMouseDown={() => !isMoving && onClose()}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="move-title"
                onMouseDown={event => event.stopPropagation()}
                onSubmit={move}
                className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-panel p-6 shadow-xl"
            >
                <h2 id="move-title" className="mb-3 text-heading text-fg-heading">Move {countLabel} to...</h2>

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
                    {searchError && <p role="alert" className="text-sm text-danger">{searchError}</p>}
                    {boxes && boxes.length === 0 && (
                        <p className="py-6 text-center text-sm text-fg-subtle">No boxes match "{text.trim()}".</p>
                    )}
                    {owned.length > 0 && (
                        <>
                            <h3 className="mb-1 eyebrow text-xs text-fg-subtle">Your boxes</h3>
                            <ul className="flex flex-col gap-1.5">{owned.map(boxButton)}</ul>
                        </>
                    )}
                    {shared.length > 0 && (
                        <>
                            <h3 className="mb-1 mt-4 eyebrow text-xs text-warning">Shared with you</h3>
                            <ul className="flex flex-col gap-1.5">{shared.map(boxButton)}</ul>
                        </>
                    )}
                </div>

                {target && (targetDividers === undefined || targetDividers.length > 0) && (
                    <fieldset className="mt-3 border-t border-line pt-3">
                        <legend className="mb-1.5 truncate eyebrow text-xs text-fg-subtle">
                            Where in {target.name}?
                        </legend>
                        {targetDividers === undefined ? (
                            <p className="text-sm text-fg-subtle">Loading dividers...</p>
                        ) : (
                            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                                {[{ id: null, name: "Not behind a divider" }, ...targetDividers].map(divider => (
                                    <label
                                        key={divider.id ?? "none"}
                                        className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition has-focus-visible:ring-2 has-focus-visible:ring-accent-line/40 ${
                                            dividerId === divider.id
                                                ? "border-accent-line bg-accent-soft font-semibold text-accent-ink"
                                                : "border-line-strong text-fg-muted hover:bg-surface-muted"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="move-divider"
                                            checked={dividerId === divider.id}
                                            onChange={() => setDividerChoice({ boxId: target.id, dividerId: divider.id })}
                                            className="sr-only"
                                        />
                                        {divider.name}
                                    </label>
                                ))}
                            </div>
                        )}
                    </fieldset>
                )}
                {isAlreadyThere && <p className="mt-3 text-sm text-fg-muted">The cards are already in this box.</p>}
                {dividerError && <p role="alert" className="mt-3 text-sm text-danger">{dividerError}</p>}
                {errorMessage && <p role="alert" className="mt-3 text-sm text-danger">{errorMessage}</p>}

                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        disabled={isMoving}
                        onClick={onClose}
                        className="rounded-md border border-button-line bg-button px-3 py-2 text-sm font-medium text-button-fg hover:bg-button-hover disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isMoving || !target || isAlreadyThere || targetDividers === undefined}
                        className="max-w-72 truncate rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isMoving ? "Moving..."
                            : target ? `Move ${countLabel} to ${target.name}${dividerName ? ` › ${dividerName}` : ""}`
                            : `Move ${countLabel}`}
                    </button>
                </div>
            </form>
        </div>
    )
}
