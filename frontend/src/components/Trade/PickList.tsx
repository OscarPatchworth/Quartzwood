import type { TradeQuoteItemDto } from "../../interfaces/generated.ts"
import { cardImageUrl } from "../../utils/cardImageUrl"
import { formatPrice } from "../../utils/formatPrice"
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
    const byBox = groupByBox(outgoing)
    const collectedCount = outgoing.filter(card => collected.has(card.cardId)).length

    return (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section aria-labelledby="pick-title" className="rounded-lg border border-rose-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-baseline gap-3">
                    <h2 id="pick-title" className="mr-auto text-lg font-bold text-slate-900">Collect the cards you're giving</h2>
                    <span className="text-sm text-slate-600" aria-live="polite">{collectedCount} of {outgoing.length} collected</span>
                    <button type="button" onClick={() => onTickAll(collectedCount < outgoing.length)}
                        className="text-sm font-semibold text-sky-800 hover:underline">
                        {collectedCount < outgoing.length ? "Tick all" : "Untick all"}
                    </button>
                </div>

                {outgoing.length === 0 && <p className="text-sm text-slate-500">You're not giving any cards in this trade.</p>}

                {byBox.map(({ boxName, path, cards }) => (
                    <div key={cards[0].boxId} className="mb-4 last:mb-0">
                        <h3 className="font-semibold text-slate-900">{boxName}</h3>
                        <p className="mb-1 text-xs text-slate-500">{path}</p>
                        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                            {cards.map(card => {
                                const isCollected = collected.has(card.cardId)
                                return (
                                    <li key={card.cardId}>
                                        <label className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${isCollected ? "bg-emerald-50" : ""}`}>
                                            <input type="checkbox" checked={isCollected} onChange={() => onToggle(card.cardId)}
                                                className="size-5 shrink-0 accent-emerald-600" />
                                            {card.scryfallId && (
                                                <img src={cardImageUrl(card.scryfallId, "small")} alt="" loading="lazy" className="h-12 w-auto shrink-0 rounded" />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate text-sm font-semibold ${isCollected ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                                    {card.name ?? "Unnamed card"}
                                                </span>
                                                <span className="block text-xs text-slate-500">
                                                    {[card.setCode && `${card.setCode} #${card.setNumber}`, card.condition,
                                                      card.foilType !== "None" && card.foilType].filter(Boolean).join(" ⋆ ")}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-sm text-slate-700">{card.price !== null ? formatPrice(card.price) : ""}</span>
                                        </label>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </section>

            <section aria-labelledby="receive-summary-title" className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                <h2 id="receive-summary-title" className="mb-1 text-lg font-bold text-slate-900">You receive</h2>
                <p className="mb-2 text-xs text-slate-500">These go into the 'Cards from Trade' box in your collection.</p>
                {incoming.length === 0 ? (
                    <p className="text-sm text-slate-500">Nothing.</p>
                ) : (
                    <ul className="space-y-1 text-sm text-slate-800">
                        {incoming.map((item, index) => (
                            <li key={item.key}>
                                {Number(item.card.quantity ?? 1)} × {quoteItems[index]?.name ?? item.card.name ?? `${item.card.setCode} ${item.card.setNumber}`}
                                <span className="text-xs text-slate-500">
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

// Boxes in the order their locations sort ("Collection › Binders › A" before "... › B"), cards A-Z in each
function groupByBox(cards: OutgoingCard[]) {
    const boxes = new Map<string, OutgoingCard[]>()
    for (const card of cards) boxes.set(card.boxId, [...(boxes.get(card.boxId) ?? []), card])

    return [...boxes.values()]
        .map(boxCards => ({
            boxName: boxCards[0].boxName,
            path: boxCards[0].groupPath.map(step => step.name).join(" › "),
            cards: [...boxCards].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
        }))
        .sort((a, b) => `${a.path} › ${a.boxName}`.localeCompare(`${b.path} › ${b.boxName}`))
}
