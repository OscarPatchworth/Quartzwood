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
        <section aria-labelledby="outgoing-title" className="rounded-lg border border-danger-line bg-danger-soft/40 p-4">
            <h2 id="outgoing-title" className="mb-3 flex items-baseline justify-between text-heading text-fg-heading">
                You give
                <span className="text-danger">{formatPrice(total)}</span>
            </h2>

            {outgoing.length === 0 ? (
                <p className="text-sm text-fg-subtle">Nothing yet: click cards in Trade Options below to add them.</p>
            ) : (
                <ul className="divide-y divide-danger-line">
                    {outgoing.map(card => (
                        <li key={card.cardId} className="flex items-center gap-3 py-2">
                            {card.scryfallId ? (
                                <img src={cardImageUrl(card.scryfallId, "small")} alt="" loading="lazy" className="h-14 w-auto shrink-0 rounded" />
                            ) : (
                                <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-surface-sunken text-xs text-fg-subtle">?</div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-fg">{card.name ?? "Unnamed card"}</p>
                                <p className="text-xs text-fg-subtle">
                                    {[card.setCode && `${card.setCode} #${card.setNumber}`, card.condition,
                                      card.foilType !== "None" && card.foilType].filter(Boolean).join(" ⋆ ")}
                                </p>
                                <p className="truncate text-xs text-fg-subtle">in {card.boxName}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-fg">{card.price !== null ? formatPrice(card.price) : "No price"}</p>
                                <button type="button" onClick={() => onRemove(card.cardId)}
                                    className="mt-1 text-xs text-danger hover:underline">
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
