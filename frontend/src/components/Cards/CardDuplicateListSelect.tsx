import { useState, useEffect } from "react"
import type { GroupedCardDto, CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client.ts"

interface CardDuplicateListSelectProps {
    groupedCards: GroupedCardDto
}

export function CardDuplicateListSelect({ groupedCards }: CardDuplicateListSelectProps) {

    const [cards, setCards] = useState<CardDto[]>([])

    useEffect(() => {
        let isCurrent = true

        Promise.all(groupedCards.ids.map(cardId => client.get<CardDto>(`/cards/${cardId}`)))
            .then(responses => {
                if (isCurrent) {
                    setCards(responses.map(response => response.data))
                }
            })
            .catch(() => {
                if (isCurrent) {setCards([])}
            })

        return () => {
            isCurrent = false
        }
    }, [groupedCards.ids])

    return(
        <>
            <div className="flex flex-col">
                {cards.map(c => (
                    <div>
                        <p> {c.name}</p>
                    </div>
                ))}
            </div>
        </>
    )

}