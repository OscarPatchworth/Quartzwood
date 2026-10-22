import { useState, useEffect } from "react"
import {
    getApiCardsById,
    postApiCards,
    postApiCardsBulkDelete,
    postApiCardsBulkMove,
    putApiCardsById,
    type AddCardDto,
    type CardDto,
    type DividerDto,
    type GroupedCardDto,
    type UpdateCardDto,
} from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { CardDetails } from "./CardDetails"
import { CardEditForm } from "./CardEditForm"
import { CardDuplicateListSelect } from "./CardDuplicateListSelect.tsx"
import { CardTagEditor } from "../Tags/CardTagEditor"

interface CECProps {
  cards?: GroupedCardDto
    onMutationComplete?: () => Promise<void>
    // After a tag change: reload the page's list but keep the panel open (several tags in a row is common)
    onTagsChanged?: () => Promise<void>
    // The card's box's dividers (front first): shows a "Divider" picker to move the card behind one.
    // Left out on pages that span several boxes
    dividers?: DividerDto[]
}

export function CardEditController({cards, onMutationComplete, onTagsChanged, dividers}: CECProps){

    const [displayCard, setDisplayCard] = useState<CardDto>();
    const [editMode, setEditMode] = useState<boolean>(false);
    const [selectedGroupedCardIds, setSelectedGroupedCardIds] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [actionError, setActionError] = useState<string>()

    function updateSelectedGroupedCards(cardIds: string[])
    {
        setSelectedGroupedCardIds(cardIds)

        if (cardIds.length > 0 && cardIds[0] !== displayCard?.id)
        {
            getApiCardsById({ path: { id: cardIds[0] } })
            .then((res) => { setDisplayCard(res.data) })
        }
    }

    // Tags apply to the selected copies, or the shown card when none are picked (same as Update/Delete)
    const tagCardIds = selectedGroupedCardIds.length > 0
        ? selectedGroupedCardIds
        : displayCard ? [displayCard.id] : []

    async function afterTagsChanged() {
        if (displayCard) {
            const res = await getApiCardsById({ path: { id: displayCard.id } })
            setDisplayCard(res.data)
        }
        await onTagsChanged?.()
    }

    useEffect(() =>{
        if(cards && cards.ids.length > 0){
            getApiCardsById({ path: { id: cards.ids[0] } })
            .then((res) => { setDisplayCard(res.data) })
        }
    }, [cards])

    async function updateSelectedCards() {
        if (!displayCard || isSaving) return

        const cardIds = selectedGroupedCardIds.length > 0
            ? selectedGroupedCardIds
            : [displayCard.id]
        const updateDto: UpdateCardDto = {
            setCode: displayCard.setCode,
            setNumber: displayCard.setNumber,
            name: displayCard.name,
            condition: displayCard.condition,
            foilType: displayCard.foilType,
            stampType: displayCard.stampType,
            language: displayCard.language,
            isProxy: displayCard.isProxy,
            isSigned: displayCard.isSigned,
            isList: displayCard.isList,
            alterArtist: displayCard.alterArtist ?? "",
            notes: displayCard.notes,
            boxId: displayCard.boxId,
            acquiredDate: null,
            purchasePrice: null,
        }

        setIsSaving(true)
        setActionError(undefined)
        try {
            await Promise.all(cardIds.map(cardId => putApiCardsById({ path: { id: cardId }, body: updateDto })))
        } catch {
            setActionError("Could not update the selected cards. Please try again.")
            setIsSaving(false)
            return
        }

        setEditMode(false)
        try {
            await onMutationComplete?.()
        } catch {
            setActionError("Cards were updated, but the box list could not be refreshed.")
        }
        setIsSaving(false)
    }

    async function deleteSelectedCards() {
        if (isSaving) return

        const cardIds = selectedGroupedCardIds.length > 0
            ? selectedGroupedCardIds
            : displayCard ? [displayCard.id] : []
        if (cardIds.length === 0) return

        const countLabel = cardIds.length === 1 ? "1 selected card" : `${cardIds.length} selected cards`
        if (!window.confirm(`Delete ${countLabel}? This cannot be undone.`)) return

        setIsSaving(true)
        setActionError(undefined)
        try {
            // One request for all of them: either every selected copy is deleted or none is
            await postApiCardsBulkDelete({ body: { cardIds } })
        } catch {
            setActionError("Could not delete the selected cards. Please try again.")
            setIsSaving(false)
            return
        }

        try {
            await onMutationComplete?.()
        } catch {
            setActionError("Cards were deleted, but the box list could not be refreshed.")
        }
        setIsSaving(false)
    }

    // Same cards as Update/Delete: the selected copies, or the shown card when none are picked
    async function moveToDivider(dividerId: string | null) {
        if (!displayCard || isSaving) return

        setIsSaving(true)
        setActionError(undefined)
        try {
            await postApiCardsBulkMove({ body: { cardIds: tagCardIds, boxId: displayCard.boxId, dividerId } })
        } catch (error) {
            setActionError(getErrorMessage(error, "Could not move the cards. Please try again."))
            setIsSaving(false)
            return
        }

        try {
            await onMutationComplete?.()
        } catch {
            setActionError("Cards were moved, but the box list could not be refreshed.")
        }
        setIsSaving(false)
    }

    async function addCardCopy() {
        if (!displayCard || isSaving) return

        const addDto: AddCardDto = {
            setCode: displayCard.setCode,
            setNumber: displayCard.setNumber,
            name: displayCard.name,
            condition: displayCard.condition,
            foilType: displayCard.foilType,
            stampType: displayCard.stampType,
            language: displayCard.language,
            isProxy: displayCard.isProxy,
            isSigned: displayCard.isSigned,
            isList: displayCard.isList,
            alterArtist: displayCard.alterArtist,
            notes: displayCard.notes,
            boxId: displayCard.boxId,
            // The copy goes next to the original
            dividerId: displayCard.dividerId,
        }

        setIsSaving(true)
        setActionError(undefined)
        try {
            await postApiCards({ body: addDto })
        } catch {
            setActionError("Could not add a copy of this card. Please try again.")
            setIsSaving(false)
            return
        }

        try {
            await onMutationComplete?.()
        } catch {
            setActionError("The card was added, but the box list could not be refreshed.")
        }
        setIsSaving(false)
    }

    return(
        <>
        <div className="relative mr-5 mt-2">
            <button
                type="button"
            className="absolute right-2 top-2 z-30 translate-x-1/2 -translate-y-1/2 rounded-xl border border-warning-line bg-warning-soft-strong px-4 py-2 text-sm font-semibold text-warning shadow-sm transition hover:bg-warning-soft-strong focus:outline-none focus:ring-2 focus:ring-warning-solid"
                onClick={() => setEditMode(!editMode)}
            >
                Edit
            </button>

            {editMode &&
                <div className="absolute left-full top-12 z-10 flex -translate-x-2 flex-col gap-2">
                    <button
                        type="button"
                        className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-accent-line/40 bg-accent-soft text-sm font-semibold text-accent-ink shadow-sm transition hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent-line disabled:cursor-wait disabled:opacity-60"
                        disabled={isSaving}
                        onClick={updateSelectedCards}
                    >
                        <span className="-rotate-90 whitespace-nowrap">Update</span>
                    </button>

                    <button
                        type="button"
                        className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-danger-line bg-danger-soft-strong text-sm font-semibold text-danger shadow-sm transition hover:bg-danger-soft-strong focus:outline-none focus:ring-2 focus:ring-danger-solid disabled:cursor-wait disabled:opacity-60"
                        disabled={isSaving}
                        onClick={deleteSelectedCards}
                    >
                        <span className="-rotate-90 whitespace-nowrap">Delete</span>
                    </button>
                </div>
            }

            <div className="relative z-20">
                {editMode ?
                    <CardEditForm card={displayCard} onChange={setDisplayCard} /> :
                    <CardDetails card={displayCard} />
                }
                {actionError && <p className="px-2 pb-2 text-sm text-danger" role="alert">{actionError}</p>}
                {displayCard && dividers && dividers.length > 0 && (
                    <label className="flex flex-wrap items-center gap-2 px-2 pb-2 text-sm">
                        <span className="font-medium text-fg-muted">Divider</span>
                        <select
                            value={displayCard.dividerId ?? ""}
                            disabled={isSaving}
                            onChange={e => void moveToDivider(e.target.value || null)}
                            className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2 py-1 text-sm outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line/20 disabled:opacity-60"
                        >
                            <option value="">Not behind a divider</option>
                            {dividers.map(divider => <option key={divider.id} value={divider.id}>{divider.name}</option>)}
                        </select>
                        {tagCardIds.length > 1 && (
                            <span className="w-full text-xs text-fg-subtle">Moves the {tagCardIds.length} selected copies</span>
                        )}
                    </label>
                )}
                {displayCard && (
                    <CardTagEditor cardIds={tagCardIds} tags={displayCard.tags} onChanged={afterTagsChanged} />
                )}
                
                {editMode &&
                    <button
                        type="button"
                        aria-label="Add a copy of this card"
                        title="Add a copy"
                        className="absolute bottom-2 right-2 z-30 flex h-10 w-10 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-xl border border-success-line bg-success-soft-strong text-2xl font-semibold leading-none text-success shadow-sm transition hover:bg-success-soft-strong focus:outline-none focus:ring-2 focus:ring-success-solid disabled:cursor-wait disabled:opacity-60"
                        disabled={isSaving}
                        onClick={addCardCopy}
                    >
                        +
                    </button>
                }
            </div>
            
        </div>
            
                
        {cards &&
            <div className="pt-4">
                <CardDuplicateListSelect
                    groupedCards={cards} 
                    setSelectedCards={updateSelectedGroupedCards}
                    />
            </div>
        }
        </>
    )
    
}

