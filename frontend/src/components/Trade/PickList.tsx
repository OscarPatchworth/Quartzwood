import type { TradeQuoteItemDto } from "../../interfaces/generated.ts"
import { BoxPickList } from "../misc/BoxPickList"
import type { IncomingCard, OutgoingCard } from "./tradeTypes"

interface PickListProps {
    outgoing: OutgoingCard[]
    incoming: IncomingCard[]
    quoteItems: TradeQuoteItemDto[]
    collected: ReadonlySet<string>
    onToggle: (cardId: string) => void
    onTickAll: (ticked: boolean) => void
}

// The cards to fetch before handing them over, grouped by the box they're in (so you can go box by box),
// each with a tick box. Plus a reminder of what you're getting
export function PickList({ outgoing, incoming, quoteItems, collected, onToggle, onTickAll }: PickListProps) {
    return (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <BoxPickList
                title="Collect the cards you're giving"
                // One line per card: the tick is kept per card id
                items={outgoing.map(card => ({ ...card, key: card.cardId, count: 1 }))}
                collected={collected}
                onToggle={onToggle}
                onTickAll={onTickAll}
                emptyText="You're not giving any cards in this trade."
                className="border-danger-line"
            />

            <section aria-labelledby="receive-summary-title" className="rounded-lg border border-success-line bg-success-soft/40 p-4">
                <h2 id="receive-summary-title" className="mb-1 text-heading text-fg">You receive</h2>
                <p className="mb-2 text-xs text-fg-subtle">These go into the 'Cards from Trade' box in your collection.</p>
                {incoming.length === 0 ? (
                    <p className="text-sm text-fg-subtle">Nothing.</p>
                ) : (
                    <ul className="space-y-1 text-sm text-fg">
                        {incoming.map((item, index) => (
                            <li key={item.key}>
                                {Number(item.card.quantity ?? 1)} × {quoteItems[index]?.name ?? item.card.name ?? `${item.card.setCode} ${item.card.setNumber}`}
                                <span className="text-xs text-fg-subtle">
                                    {" "}({item.card.condition ?? "NM"}{item.card.foilType && item.card.foilType !== "None" ? `, ${item.card.foilType}` : ""})
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
