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
    const [editCardAmount, setEditCardAmount] = useState<number>(1)
    const [groupedCardsAmount, setGroupedCardsAmount]  = useState<number>(0)

    function adjustEditCardAmout(amount: number){
        var newAmount = editCardAmount + amount
        const minEditableCards = 1
        if (newAmount >= minEditableCards && newAmount <= groupedCardsAmount)
            {setEditCardAmount(editCardAmount+amount)}
    }


    useEffect(() =>{
        if(cards && cards.ids.length > 0){
            client.get<CardDto>(`/cards/${cards.ids[0]}`)
            .then((res) => { setDisplayCard(res.data) })

            setGroupedCardsAmount(cards.ids.length)
        }
    }, [cards])

    return(
        <>
         <div className="flex justify-end float-right">
            <button
                type="button"
                className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                onClick={() => setEditMode(!editMode)}
            >
                Edit
            </button>
        </div>

        {editMode ?
            <CardEditForm card={displayCard} onChange={setDisplayCard} /> :
            <CardDetails card={displayCard} />
        }
            
        <div className=" ml-3 mr-4 flex justify-between" >

            <button
                type="button"
                className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900 shadow-sm transition hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                onClick={() => setEditMode(!editMode)}
            >
                Delete
            </button>

            {cards && cards.ids.length > 1 &&
            <div className="flex flex-col justify-center">
                <div>
                    <label>Editing {editCardAmount} cards</label>
                </div>
                <div className="flex justify-center">
                    <button
                        type="button"
                        className="rounded-xl border border-olive-300 bg-olive-100 px-4 py-2 text-sm font-semibold text-olive-900 shadow-sm transition hover:bg-olive-200 focus:outline-none focus:ring-2 focus:ring-olive-400"
                        onClick={() => adjustEditCardAmout(-1)}
                    >
                        ▼
                    </button>
                    <button
                        type="button"
                        className="rounded-xl border border-olive-300 bg-olive-100 px-4 py-2 text-sm font-semibold text-olive-900 shadow-sm transition hover:bg-olive-200 focus:outline-none focus:ring-2 focus:ring-olive-400"
                        onClick={() => adjustEditCardAmout(1)}
                    >
                    ▲
                    </button>
                </div>
            </div>
            }

            <button
                type="button"
                className="rounded-xl border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                onClick={() => setEditMode(!editMode)}
            >
                Update
            </button>
        </div>                
        {cards &&
            <CardDuplicateListSelect
                groupedCards={cards}
            />
        }
        </>
    )
    
}

