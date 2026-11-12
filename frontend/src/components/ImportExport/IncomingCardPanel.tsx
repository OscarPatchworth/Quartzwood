import { useState } from "react"
import type { CardDto, ImportEditDto, ImportIncomingStackDto } from "../../interfaces/generated.ts"
import { CardDetails } from "../Cards/CardDetails"
import { CardEditForm } from "../Cards/CardEditForm"
import { CopyCountWheel } from "../Cards/CopyCountWheel"

interface IncomingCardPanelProps {
    stack: ImportIncomingStackDto
    // Update or Delete: the change to make to the list (nothing is saved until the list is added)
    onApply: (edit: ImportEditDto) => Promise<void>
}

// The list's card as the card panel's form expects it. It isn't a real card yet, so it has no id or box
function asCard(stack: ImportIncomingStackDto): CardDto {
    return {
        id: stack.key,
        name: stack.name,
        setCode: stack.setCode,
        setNumber: stack.setNumber,
        scryfallId: stack.scryfallId,
        condition: stack.condition,
        foilType: stack.foilType,
        stampType: stack.stampType,
        language: stack.language,
        isProxy: stack.isProxy,
        isSigned: stack.isSigned,
        isList: stack.isList,
        alterArtist: stack.alterArtist,
        notes: stack.notes,
        boxId: "",
        dividerId: null,
        tags: [],
        addedAt: null,
        price: null,
    }
}

// The card panel for a card in a list being compared (the bottom row): fix what the file got wrong (a ManaBox
// scan doesn't know a card is foil or Japanese, say) before adding it. Looks and works like the box's card panel:
// Edit, then Update or Delete; the wheel picks how many of the stack's copies (the last ones in the list first)
export function IncomingCardPanel({ stack, onApply }: IncomingCardPanelProps) {
    const [card, setCard] = useState(() => asCard(stack))
    const [editMode, setEditMode] = useState(false)
    const total = Number(stack.count)
    const [count, setCount] = useState(1)
    const [isSaving, setIsSaving] = useState(false)
    const [actionError, setActionError] = useState<string>()

    async function apply(remove: boolean) {
        if (isSaving) return
        setIsSaving(true)
        setActionError(undefined)
        try {
            await onApply({
                key: stack.key,
                count,
                remove,
                condition: card.condition,
                foilType: card.foilType,
                stampType: card.stampType,
                language: card.language,
                isProxy: card.isProxy,
                isSigned: card.isSigned,
                isList: card.isList,
                alterArtist: card.alterArtist,
                notes: card.notes,
            })
        } catch {
            setActionError(remove ? "Could not take the cards off the list. Please try again." : "Could not change the cards. Please try again.")
            setIsSaving(false)
        }
    }

    return (
        <>
            <p className="mb-2 rounded-md bg-surface-sunken px-3 py-2 text-xs text-fg-muted">
                From the list: not added yet. Changes here apply when you add the list.
            </p>
            <div className="relative mr-5 mt-2">
                <button
                    type="button"
                    className="absolute right-2 top-2 z-30 translate-x-1/2 -translate-y-1/2 rounded-xl border border-cardinfo-edit-line bg-cardinfo-edit px-4 py-2 text-sm font-semibold text-cardinfo-edit-fg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cardinfo-accent"
                    onClick={() => setEditMode(!editMode)}
                >
                    Edit
                </button>

                {editMode &&
                    <div className="absolute left-full top-12 z-10 flex -translate-x-2 flex-col gap-2">
                        <button
                            type="button"
                            className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-cardinfo-update-line bg-cardinfo-update text-sm font-semibold text-cardinfo-update-fg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cardinfo-update-fg disabled:cursor-wait disabled:opacity-60"
                            disabled={isSaving}
                            onClick={() => void apply(false)}
                        >
                            <span className="-rotate-90 whitespace-nowrap">Update</span>
                        </button>

                        <button
                            type="button"
                            title="Take them off the list"
                            className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-cardinfo-delete-line bg-cardinfo-delete text-sm font-semibold text-cardinfo-delete-fg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cardinfo-delete-fg disabled:cursor-wait disabled:opacity-60"
                            disabled={isSaving}
                            onClick={() => void apply(true)}
                        >
                            <span className="-rotate-90 whitespace-nowrap">Delete</span>
                        </button>
                    </div>
                }

                <div className="relative z-20">
                    {editMode
                        ? <CardEditForm card={card} onChange={setCard} lockPrinting />
                        : <CardDetails card={card} />}
                    {actionError && <p className="px-2 pb-2 text-sm text-danger" role="alert">{actionError}</p>}
                </div>
            </div>

            {total > 1 &&
                <div className="flex flex-col items-center gap-1 pt-4">
                    <CopyCountWheel value={count} max={total} onChange={setCount} label={`Copies of ${stack.name} in the list`} />
                    <p className="text-xs font-semibold text-copywheel-fg">
                        {count === total ? "All copies" : count === 1 ? "The last copy in the list" : `The last ${count} copies in the list`}
                    </p>
                </div>
            }
        </>
    )
}
