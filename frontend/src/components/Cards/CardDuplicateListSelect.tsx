import { useState, useEffect } from "react"
import type { GroupedCardDto, CardDto } from "../../interfaces/generated.ts"
import client from "../../api/client.ts"

interface CardDuplicateListSelectProps {
    groupedCards: GroupedCardDto
}

export function CardDuplicateListSelect({ groupedCards }: CardDuplicateListSelectProps) {

    const [cards, setCards] = useState<CardDto[]>([])
    const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(() => new Set())

    function toggleCard(cardId: string) {
        setSelectedCardIds(current => {
            const next = new Set(current)
            if (next.has(cardId) && next.size > 1) {
                next.delete(cardId)
            } else {
                next.add(cardId)
            }
            return next
        })
    }

    useEffect(() => {
        let isCurrent = true

        Promise.all(groupedCards.ids.map(cardId => client.get<CardDto>(`/cards/${cardId}`)))
            .then(responses => {
                if (isCurrent) {
                    const loadedCards = responses.map(response => response.data)
                    setCards(loadedCards)
                    setSelectedCardIds(new Set(loadedCards.map(card => card.id)))
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
                {cards.map(c => (
                <button
                    key={c.id}
                    type="button"
                    aria-pressed={selectedCardIds.has(c.id)}
                    onClick={() => toggleCard(c.id)}
                    className={`flex w-2/3 items-center m-1 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-lime-200 ${
                        selectedCardIds.has(c.id)
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
        </>
    )

}