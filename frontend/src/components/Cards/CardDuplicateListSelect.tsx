import { useState, useEffect } from "react"
import { getApiCardsById, type GroupedCardDto, type CardDto } from "../../interfaces/generated.ts"
import { CopyCountWheel } from "./CopyCountWheel"

interface CardDuplicateListSelectProps {
    groupedCards: GroupedCardDto,
    setSelectedCards: (cardIds: string[]) => void,
}

// Newest first: picking 2 of 6 takes the 2 most recently added, which is what an over-scan just created.
// Cards from before "added" was recorded count as oldest
function newestFirst(a: CardDto, b: CardDto) {
    return (b.addedAt ?? "").localeCompare(a.addedAt ?? "")
}

// How many of a stack's copies the card panel acts on (Update/Delete/Divider/tags). The copies are identical,
// so it's a count, picked on a wheel, rather than a list of copies to tick
export function CardDuplicateListSelect({ groupedCards, setSelectedCards }: CardDuplicateListSelectProps) {

    const [cards, setCards] = useState<CardDto[]>([])
    const [count, setCount] = useState(0)

    function changeCount(next: number) {
        setCount(next)
        setSelectedCards(cards.slice(0, next).map(card => card.id))
    }

    useEffect(() => {
        var isCurrent = true

        Promise.all(groupedCards.ids.map(cardId => getApiCardsById({ path: { id: cardId } })))
            .then(responses => {
                if (isCurrent) {
                    const loadedCards = responses.map(response => response.data).sort(newestFirst)
                    // Just the newest to start with: turn the wheel up for more
                    setCards(loadedCards)
                    setCount(1)
                    setSelectedCards(loadedCards.slice(0, 1).map(card => card.id))
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
            <div className="flex flex-col items-center gap-1">
                <CopyCountWheel value={count} max={cards.length} onChange={changeCount} label={`Copies of ${cards[0].name ?? "this card"}`} />
                <p className="text-xs font-semibold text-copywheel-fg">
                    {count === cards.length ? "All copies" : count === 1 ? "The newest copy" : `The ${count} newest copies`}
                </p>
            </div>
        }
        </>
    )

}
