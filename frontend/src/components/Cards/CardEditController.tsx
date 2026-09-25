import { useState, useEffect } from "react"
import type { GroupedCardDto } from "../../interfaces/generated.ts"
import type { CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client"
import { CardDetails } from "./CardDetails"
import { ButtonBasic } from "../Buttons/ButtonBasic.tsx"

interface CECProps {
  cards?: GroupedCardDto
}

export function CardEditController({cards: cards}: CECProps){

    const [displayCard, setDisplayCard] = useState<CardDto>();
    const [editMode, setEditMode] = useState<Boolean>(false);

    useEffect(() =>{
        if(cards && cards.ids.length > 0){
            client.get<CardDto>(`/cards/${cards.ids[0]}`)
            .then((res) => { setDisplayCard(res.data) })
        }
    })

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
            <p> Editing Cards</p> :
            <CardDetails card={displayCard} />
        }
            
        <div className=" ml-3 mr-4 flex justify-between" >
        <ButtonBasic label="Update" color="008080" />
        <ButtonBasic label="Delete" color="800080"/>    
        </div>    
        
        
               
        </>
    )
    
}

