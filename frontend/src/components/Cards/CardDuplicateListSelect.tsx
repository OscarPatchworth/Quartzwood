import { useState, useEffect } from "react"
import { getApiCardsById, type GroupedCardDto, type CardDto } from "../../interfaces/generated.ts"

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

        Promise.all(groupedCards.ids.map(cardId => getApiCardsById({ path: { id: cardId } })))
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
                    className={`flex w-2/3 items-center m-1 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-success-line ${
                        selectedCardIds.includes(c.id)
                            ? "border-accent-line bg-accent-soft text-accent-ink shadow-sm"
                            : "border-line-strong bg-surface-sunken text-fg hover:bg-surface-strong"
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