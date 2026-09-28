import { useState, useEffect } from "react"
import type { GroupedCardDto, CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client.ts"
import { LoadingIndicator } from "../misc/loadingIndicator.tsx"

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
            <div className="flex flex-col items-center">
                {(cards.length == 0) &&
                    <LoadingIndicator />
                }
                {cards.map(c => (
                    <button
                        type="button"
                        className="rounded-xl w-1/2 border border-sky-300 bg-sky-100 px-2 py-2 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-200 
                        focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                        <p> {c.name}</p>
                    </button>
                ))}
            </div>
        </>
    )

}