import { useState, useEffect } from "react"
import type { GroupedCardDto, CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client.ts"

interface CardDuplicateListSelectProps {
    groupedCards: GroupedCardDto,
    setSelectedCards: (cardIds: string[]) => void,
}

export function CardDuplicateListSelect({ groupedCards, setSelectedCards }: CardDuplicateListSelectProps) {

    const [cards, setCards] = useState<CardDto[]>([])
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])

    function toggleCard(cardId: string) {
        var updatedSelectedCardIds: string[]
        if (selectedCardIds.includes(cardId)) {
            updatedSelectedCardIds = selectedCardIds.length > 1
                ? selectedCardIds.filter(id => id !== cardId)
                : selectedCardIds
        } else {
            updatedSelectedCardIds = [...selectedCardIds, cardId]
        }

        setSelectedCardIds(updatedSelectedCardIds)
        setSelectedCards(updatedSelectedCardIds)

    }

    useEffect(() => {
        var isCurrent = true

        Promise.all(groupedCards.ids.map(cardId => client.get<CardDto>(`/cards/${cardId}`)))
            .then(responses => {
                if (isCurrent) {
                    const loadedCards = responses.map(response => response.data)
                    const loadedCardIds = loadedCards.map(card => card.id)
                    setCards(loadedCards)
                    setSelectedCardIds(loadedCardIds)
                    setSelectedCards(loadedCardIds)
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
        {cards.length > 1 &&
            <div className="flex flex-col items-center">
                {cards.map(c => (
                <button
                    key={c.id}
                    type="button"
                    aria-pressed={selectedCardIds.includes(c.id)}
                    onClick={() => toggleCard(c.id)}
                    className={`flex w-2/3 items-center m-1 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-lime-200 ${
                        selectedCardIds.includes(c.id)
                            ? "border-slate-300 bg-mauve-400 text-mauve-900 shadow-sm"
                            : "border-zinc-300 bg-zinc-100 text-zinc-900 hover:bg-mist-400"
                    }`}
                >
                    <div className="text-center w-full">
                        <p>{c.name}</p>
                    </div>
                    
                </button>
                ))}
            </div>
        }
        </>
    )

}