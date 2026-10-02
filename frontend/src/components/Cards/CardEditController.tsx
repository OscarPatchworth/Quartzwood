import { useState, useEffect } from "react"
import type { GroupedCardDto } from "../../interfaces/generated.ts"
import type { CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client"
import { CardDetails } from "./CardDetails"
import { CardEditForm } from "./CardEditForm"
import { CardDuplicateListSelect } from "./CardDuplicateListSelect.tsx"

interface CECProps {
  cards?: GroupedCardDto
}

export function CardEditController({cards: cards}: CECProps){

    const [displayCard, setDisplayCard] = useState<CardDto>();
    const [editMode, setEditMode] = useState<Boolean>(false);
    const [groupedCardsAmount, setGroupedCardsAmount]  = useState<number>(0)
    const [selectedGroupedCardIds, setSelectedGroupedCardIds] = useState<string[]>([])

    useEffect(() =>{
        if(cards && cards.ids.length > 0){
            client.get<CardDto>(`/cards/${cards.ids[0]}`)
            .then((res) => { setDisplayCard(res.data) })

            setGroupedCardsAmount(cards.ids.length)
        }
    }, [cards])

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

            <div className="absolute left-full top-12 z-10 flex -translate-x-2 flex-col gap-2">
                <button
                    type="button"
                    className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-sky-300 bg-sky-100 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    onClick={() => setEditMode(!editMode)}
                >
                    <span className="-rotate-90 whitespace-nowrap">Update</span>
                </button>

                <button
                    type="button"
                    className="flex h-16 w-9 items-center justify-center rounded-r-md border border-l-0 border-rose-300 bg-rose-100 text-sm font-semibold text-rose-900 shadow-sm transition hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    onClick={() => setEditMode(!editMode)}
                >
                    <span className="-rotate-90 whitespace-nowrap">Delete</span>
                </button>
            </div>

            <div className="relative z-20">
                {editMode ?
                    <CardEditForm card={displayCard} onChange={setDisplayCard} /> :
                    <CardDetails card={displayCard} />
                }
            </div>
            
        </div>
            
                
        {cards &&
            <div className="pt-4">
                <CardDuplicateListSelect
                    groupedCards={cards} 
                    setSelectedCards={setSelectedGroupedCardIds}
                    />
            </div>
        }
        </>
    )
    
}

