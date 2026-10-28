import { useEffect, useState, type FormEvent } from "react"
import {
    getApiGroupsByEntityByEntityId, postApiCardsBulkDelete, postApiCardsBulkMoveToNewBox, type GroupDto,
} from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { treeOrder } from "../../utils/groupTree"
import { MoveDialog } from "../Cards/MoveDialog"

// What happened, for the summary shown afterwards
export interface FetchOutcome {
    action: "moved" | "deleted"
    count: number
    boxId?: string
    boxName?: string
}

interface FinishFetchDialogProps {
    // The copies ticked off on the pick list: only these are moved or deleted
    cardIds: string[]
    // Copies on the pick list that weren't ticked (left where they are)
    untickedCount: number
    personalEntityId: string
    rootGroupId: string
    onClose: () => void
    onFinished: (outcome: FetchOutcome) => void
}

type Choice = "new-box" | "existing-box" | "delete"

// Done collecting: move the cards into a new box, into one of your boxes, or delete them.
// Each is all or nothing on the server: if it fails, nothing has changed
export function FinishFetchDialog({ cardIds, untickedCount, personalEntityId, rootGroupId, onClose, onFinished }: FinishFetchDialogProps) {
    const [choice, setChoice] = useState<Choice>("new-box")
    const [boxName, setBoxName] = useState("")
    const [groupId, setGroupId] = useState(rootGroupId)
    const [groups, setGroups] = useState<{ group: GroupDto, depth: number }[]>([])
    const [isPickingBox, setIsPickingBox] = useState(false)
    const [isWorking, setIsWorking] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    useEffect(() => {
        getApiGroupsByEntityByEntityId({ path: { entityId: personalEntityId } })
            .then(res => setGroups(treeOrder(res.data)))
            .catch(() => setGroups([]))
    }, [personalEntityId])

    const countLabel = cardIds.length === 1 ? "1 card" : `${cardIds.length} cards`

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (choice === "existing-box") {
            setIsPickingBox(true)
            return
        }

        setIsWorking(true)
        setErrorMessage(undefined)
        try {
            if (choice === "new-box") {
                const res = await postApiCardsBulkMoveToNewBox({ body: { cardIds, boxName: boxName.trim(), groupId } })
                onFinished({ action: "moved", count: Number(res.data.count), boxId: res.data.boxId, boxName: res.data.boxName })
            } else {
                const res = await postApiCardsBulkDelete({ body: { cardIds } })
                onFinished({ action: "deleted", count: Number(res.data.count) })
            }
        } catch (error) {
            setErrorMessage(failureMessage(error))
            setIsWorking(false)
        }
    }

    // The existing-box route reuses the box page's "Move to..." dialog
    if (isPickingBox) {
        return (
            <MoveDialog
                cardIds={cardIds}
                onClose={() => setIsPickingBox(false)}
                onMoved={async box => onFinished({ action: "moved", count: cardIds.length, boxId: box.id, boxName: box.name })}
            />
        )
    }

    const option = (value: Choice, label: string, tone = "") => (
        <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${choice === value
            ? "border-accent-line bg-accent-soft ring-2 ring-accent-line/30" : "border-line hover:bg-surface-muted"} ${tone}`}>
            <input type="radio" name="fetch-choice" value={value} checked={choice === value} onChange={() => setChoice(value)} className="accent-accent-line" />
            {label}
        </label>
    )

    const canSubmit = !isWorking && cardIds.length > 0 && (choice !== "new-box" || boxName.trim().length > 0)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onMouseDown={() => !isWorking && onClose()}>
            <form role="dialog" aria-modal="true" aria-labelledby="finish-fetch-title" onSubmit={submit}
                onMouseDown={event => event.stopPropagation()}
                className="w-full max-w-md rounded-lg bg-panel p-6 shadow-xl">
                <h2 id="finish-fetch-title" className="text-heading text-fg-heading">What should happen to the {countLabel}?</h2>
                {untickedCount > 0 && (
                    <p className="mt-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
                        {untickedCount} {untickedCount === 1 ? "card isn't" : "cards aren't"} ticked: {untickedCount === 1 ? "it stays" : "they stay"} where {untickedCount === 1 ? "it is" : "they are"}.
                    </p>
                )}

                <fieldset className="mt-4 space-y-2">
                    <legend className="sr-only">Choose</legend>
                    {option("new-box", "Move them to a new box")}
                    {choice === "new-box" && (
                        <div className="space-y-2 pb-1 pl-7">
                            <label className="block text-sm text-fg-muted">
                                Box name
                                <input value={boxName} onChange={event => setBoxName(event.target.value)} maxLength={100} autoFocus
                                    placeholder="e.g. Deck: Mono Blue"
                                    className="mt-1 block w-full rounded-md border border-input-line bg-input px-2 py-1.5 text-sm" />
                            </label>
                            <label className="block text-sm text-fg-muted">
                                In
                                <select value={groupId} onChange={event => setGroupId(event.target.value)}
                                    className="mt-1 block w-full rounded-md border border-input-line bg-input px-2 py-1.5 text-sm">
                                    {groups.length === 0 && <option value={rootGroupId}>Collection</option>}
                                    {groups.map(({ group, depth }) => (
                                        // Non-breaking spaces: normal spaces at the start of an <option> are collapsed
                                        <option key={group.id} value={group.id}>{"  ".repeat(depth)}{group.name}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}
                    {option("existing-box", "Move them to one of your boxes...")}
                    {option("delete", "Delete them from your collection", choice === "delete" ? "" : "text-danger")}
                    {choice === "delete" && <p className="pl-7 text-sm text-danger">This can't be undone.</p>}
                </fieldset>

                {errorMessage && <p role="alert" className="mt-3 text-sm text-danger">{errorMessage}</p>}

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" disabled={isWorking} onClick={onClose}
                        className="rounded-md border border-button-line bg-button px-3 py-2 text-sm font-medium text-button-fg hover:bg-button-hover disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={!canSubmit}
                        className={`rounded-md px-3 py-2 text-sm font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50 ${choice === "delete"
                            ? "bg-danger-solid hover:bg-danger-hover" : "bg-accent hover:bg-accent-hover"}`}>
                        {isWorking ? "Working..."
                            : choice === "new-box" ? `Move ${countLabel}`
                            : choice === "existing-box" ? "Choose a box..."
                            : `Delete ${countLabel}`}
                    </button>
                </div>
            </form>
        </div>
    )
}

// A 404 means a card on the list is gone (deleted or moved out of your Entities since the plan was made)
function failureMessage(error: unknown) {
    if (error && typeof error === "object" && (error as { status?: unknown }).status === 404)
        return "Some of these cards aren't in your collection any more. Nothing was changed: go back, search again and optimize again."
    return getErrorMessage(error, "That didn't work. Nothing was changed.")
}
