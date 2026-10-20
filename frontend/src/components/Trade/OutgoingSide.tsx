import { cardImageUrl } from "../../utils/cardImageUrl"
import { formatPrice } from "../../utils/formatPrice"
import type { OutgoingCard } from "./tradeTypes"

interface OutgoingSideProps {
    outgoing: OutgoingCard[]
    total: number
    onRemove: (cardId: string) => void
}

// Side 2, "You give": single copies picked from Trade Options (each row is one physical card)
export function OutgoingSide({ outgoing, total, onRemove }: OutgoingSideProps) {
    return (
        <section aria-labelledby="outgoing-title" className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
            <h2 id="outgoing-title" className="mb-3 flex items-baseline justify-between text-lg font-bold text-slate-900">
                You give
                <span className="text-rose-800">{formatPrice(total)}</span>
            </h2>

            {outgoing.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing yet: click cards in Trade Options below to add them.</p>
            ) : (
                <ul className="divide-y divide-rose-100">
                    {outgoing.map(card => (
                        <li key={card.cardId} className="flex items-center gap-3 py-2">
                            {card.scryfallId ? (
                                <img src={cardImageUrl(card.scryfallId, "small")} alt="" loading="lazy" className="h-14 w-auto shrink-0 rounded" />
                            ) : (
                                <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">?</div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{card.name ?? "Unnamed card"}</p>
                                <p className="text-xs text-slate-500">
                                    {[card.setCode && `${card.setCode} #${card.setNumber}`, card.condition,
                                      card.foilType !== "None" && card.foilType].filter(Boolean).join(" ⋆ ")}
                                </p>
                                <p className="truncate text-xs text-slate-500">in {card.boxName}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-slate-900">{card.price !== null ? formatPrice(card.price) : "No price"}</p>
                                <button type="button" onClick={() => onRemove(card.cardId)}
                                    className="mt-1 text-xs text-rose-700 hover:underline">
                                    Remove
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
