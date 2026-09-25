import { useState, useEffect } from "react"
import type { GroupedCardDto } from "../../interfaces/generated.ts"
import type { CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client"
import { CardDetails } from "./CardDetails"

interface CECProps {
  cards?: GroupedCardDto
}

export function CardEditController({cards: cards}: CECProps){

    const [displayCard, setDisplayCard] = useState<CardDto>();

    useEffect(() =>{
        if(cards && cards.ids.length > 0){
            client.get<CardDto>(`/cards/${cards.ids[0]}`)
            .then((res) => { setDisplayCard(res.data) })
        }
    })

    return(
        <>
            <CardDetails card={displayCard} />
        </>
    )
    
}

