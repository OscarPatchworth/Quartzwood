import { useState, useEffect } from "react"
import type { AddCardDto, GroupedCardDto, UpdateCardDto } from "../../interfaces/generated.ts"
import type { CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client"
import { CardDetails } from "./CardDetails"
import { CardEditForm } from "./CardEditForm"
import { CardDuplicateListSelect } from "./CardDuplicateListSelect.tsx"

interface CECProps {
  cards?: GroupedCardDto
    onMutationComplete?: () => Promise<void>
}

export function CardEditController({cards, onMutationComplete}: CECProps){

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
            client.get<CardDto>(`/cards/${cardIds[0]}`)
            .then((res) => { setDisplayCard(res.data) })
        }
    }

    useEffect(() =>{
        if(cards && cards.ids.length > 0){
            client.get<CardDto>(`/cards/${cards.ids[0]}`)
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
            await Promise.all(cardIds.map(cardId => client.put(`/cards/${cardId}`, updateDto)))
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
            await Promise.all(cardIds.map(cardId => client.delete(`/cards/${cardId}`)))
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
        }

        setIsSaving(true)
        setActionError(undefined)
        try {
            await client.post<CardDto>("/cards", addDto)
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
            className="absolute right-2 top-2 z-30 translate-x-1/2 -translate-y-1/2 rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                onClick={() => setEditMode(!editMode)}
            >
                Edit
            </button>

            {editMode &&
                <div className="absolute left-full top-12 z-10 flex -translate-x-2 flex-col gap-2">
                    <button
                        type="button"
                        className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-sky-300 bg-sky-100 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-wait disabled:opacity-60"
                        disabled={isSaving}
                        onClick={updateSelectedCards}
                    >
                        <span className="-rotate-90 whitespace-nowrap">Update</span>
                    </button>

                    <button
                        type="button"
                        className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-rose-300 bg-rose-100 text-sm font-semibold text-rose-900 shadow-sm transition hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-wait disabled:opacity-60"
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
                {actionError && <p className="px-2 pb-2 text-sm text-rose-700" role="alert">{actionError}</p>}
                
                {editMode &&
                    <button
                        type="button"
                        aria-label="Add a copy of this card"
                        title="Add a copy"
                        className="absolute bottom-2 right-2 z-30 flex h-10 w-10 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-100 text-2xl font-semibold leading-none text-emerald-900 shadow-sm transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-wait disabled:opacity-60"
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

