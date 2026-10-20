import type { TradeCardDto, TradeQuoteItemDto } from "../../interfaces/generated.ts"
import { AddNewCardTextBar, type NewCard } from "../AddNewCardTextBar"
import { cardImageUrl } from "../../utils/cardImageUrl"
import { formatPrice } from "../../utils/formatPrice"
import { ConditionOptions, FoilTypeOptions } from "../../utils/Enum.tsx"
import { toPrice, type IncomingCard } from "./tradeTypes"

interface IncomingSideProps {
    incoming: IncomingCard[]
    // From useTradeQuote: lined up with `incoming`; empty while re-pricing
    quoteItems: TradeQuoteItemDto[]
    total: number
    isPricing: boolean
    quoteError?: string
    onAdd: (card: NewCard) => Promise<string>
    onChange: (key: string, change: Partial<TradeCardDto>) => void
    onRemove: (key: string) => void
}

const selectClassName = "rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-800"

// Side 1, "You receive": cards typed in with the add bar (same suggestions and syntax as adding to a box),
// with condition / foil / quantity editable here, each priced for its finish
export function IncomingSide({ incoming, quoteItems, total, isPricing, quoteError, onAdd, onChange, onRemove }: IncomingSideProps) {
    return (
        <section aria-labelledby="incoming-title" className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
            <h2 id="incoming-title" className="mb-3 flex items-baseline justify-between text-lg font-bold text-slate-900">
                You receive
                <span className={`text-emerald-800 ${isPricing ? "opacity-50" : ""}`}>{formatPrice(total)}</span>
            </h2>

            <AddNewCardTextBar
                id="trade-incoming-search"
                onAdd={onAdd}
                placeholder="Card you'll get: name, or set + number e.g. IKO-107 -f"
                buttonLabel="Add"
            />

            {quoteError && <p role="alert" className="mt-2 text-sm text-rose-700">{quoteError}</p>}

            {incoming.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Nothing yet: add the cards you're getting.</p>
            ) : (
                <ul className="mt-3 divide-y divide-emerald-100">
                    {incoming.map((item, index) => {
                        const quote = quoteItems[index]
                        const quantity = Number(item.card.quantity ?? 1)
                        const unitPrice = toPrice(quote?.unitPrice)
                        return (
                            <li key={item.key} className="flex items-center gap-3 py-2">
                                {quote?.scryfallId ? (
                                    <img src={cardImageUrl(quote.scryfallId, "small")} alt="" loading="lazy" className="h-14 w-auto shrink-0 rounded" />
                                ) : (
                                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">?</div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                        {quote?.name ?? item.card.name ?? `${item.card.setCode} ${item.card.setNumber}`}
                                    </p>
                                    <p className="text-xs text-slate-500">{item.card.setCode && `${item.card.setCode.toUpperCase()} #${item.card.setNumber}`}</p>
                                    {quote?.error && <p className="text-xs text-rose-700">{quote.error}</p>}
                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                        <select aria-label="Condition" className={selectClassName} value={item.card.condition ?? "NM"}
                                            onChange={event => onChange(item.key, { condition: event.target.value })}>
                                            {ConditionOptions.map(value => <option key={value}>{value}</option>)}
                                        </select>
                                        <select aria-label="Foil" className={selectClassName} value={item.card.foilType ?? "None"}
                                            onChange={event => onChange(item.key, { foilType: event.target.value })}>
                                            {FoilTypeOptions.map(value => <option key={value} value={value}>{value === "None" ? "Non-foil" : value}</option>)}
                                        </select>
                                        <label className="flex items-center gap-1 text-xs text-slate-600">
                                            ×
                                            <input type="number" min={1} max={1000} aria-label="Quantity" value={quantity}
                                                onChange={event => onChange(item.key, { quantity: Math.max(1, Math.floor(Number(event.target.value) || 1)) })}
                                                className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs" />
                                        </label>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {isPricing ? "…" : unitPrice !== null ? formatPrice(unitPrice * quantity) : "No price"}
                                    </p>
                                    {!isPricing && unitPrice !== null && quantity > 1 && (
                                        <p className="text-xs text-slate-500">{formatPrice(unitPrice)} each</p>
                                    )}
                                    <button type="button" onClick={() => onRemove(item.key)}
                                        className="mt-1 text-xs text-rose-700 hover:underline">
                                        Remove
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
