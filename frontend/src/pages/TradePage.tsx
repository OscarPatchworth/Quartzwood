import type { CardSearchResultDto, TradeCardDto } from '../interfaces/generated.ts'
import { useAuth } from '../auth/useAuth'
import { usePersistentState } from '../hooks/usePersistentState'
import { LoadingIndicator } from '../components/misc/LoadingIndicator.tsx'
import type { NewCard } from '../components/AddNewCardTextBar'
import { IncomingSide } from '../components/Trade/IncomingSide'
import { OutgoingSide } from '../components/Trade/OutgoingSide'
import { TradeOptions } from '../components/Trade/TradeOptions'
import { useTradeQuote } from '../components/Trade/useTradeQuote'
import { cents, emptyDraft, outgoingFrom, type TradeDraft } from '../components/Trade/tradeTypes'
import { formatPrice } from '../utils/formatPrice'

// Build a trade: what you receive (Side 1), what you give (Side 2, picked from Trade Options below).
// The trade in progress is kept in this browser until it's finished or cleared
export default function TradePage() {
    const { account } = useAuth()
    if (!account) return <LoadingIndicator />
    // key: a different user on this browser gets their own draft (and a fresh component)
    return <TradeWorkspace key={account.id} userId={account.id} personalEntityId={account.personalEntityId} />
}

function TradeWorkspace({ userId, personalEntityId }: { userId: string, personalEntityId: string }) {
    const [draft, setDraft] = usePersistentState<TradeDraft>(`quartzwood.trade.${userId}`, emptyDraft)
    const quote = useTradeQuote(draft.incoming)

    const incomingTotal = quote.total
    const outgoingTotal = draft.outgoing.reduce((sum, card) => sum + (card.price ?? 0), 0)
    // What's left to give before the two sides are even (negative = you're giving more)
    const remaining = incomingTotal - outgoingTotal
    const pickedIds = new Set(draft.outgoing.map(card => card.cardId))

    // The add bar's "add": onto Side 1. The same card again (same printing, condition, finish) adds to its quantity
    async function addIncoming(card: NewCard) {
        const incoming: TradeCardDto = {
            setCode: card.setCode ?? null,
            setNumber: card.setNumber ?? null,
            name: card.name ?? null,
            condition: card.condition ?? "NM",
            foilType: card.foilType ?? "None",
            stampType: card.stampType ?? "None",
            language: card.language ?? "en",
            isProxy: card.isProxy ?? false,
            isSigned: card.isSigned ?? false,
            isList: card.isList ?? false,
            quantity: Number(card.quantity ?? 1),
        }
        const sameCard = (other: TradeCardDto) =>
            other.setCode?.toUpperCase() === incoming.setCode?.toUpperCase() && other.setNumber === incoming.setNumber
            && other.condition === incoming.condition && other.foilType === incoming.foilType
            && other.isList === incoming.isList && other.isProxy === incoming.isProxy

        setDraft(current => {
            const existing = current.incoming.find(item => sameCard(item.card))
            return {
                ...current,
                incoming: existing
                    ? current.incoming.map(item => item === existing
                        ? { ...item, card: { ...item.card, quantity: Number(item.card.quantity ?? 1) + Number(incoming.quantity) } }
                        : item)
                    : [...current.incoming, { key: crypto.randomUUID(), card: incoming }],
            }
        })
        return `Added ${incoming.quantity} × ${card.name ?? `${card.setCode} ${card.setNumber}`} to the trade`
    }

    function changeIncoming(key: string, change: Partial<TradeCardDto>) {
        setDraft(current => ({
            ...current,
            incoming: current.incoming.map(item => item.key === key ? { ...item, card: { ...item.card, ...change } } : item),
        }))
    }

    function removeIncoming(key: string) {
        setDraft(current => ({ ...current, incoming: current.incoming.filter(item => item.key !== key) }))
    }

    function pickOutgoing(row: CardSearchResultDto, cardId: string) {
        setDraft(current => current.outgoing.some(card => card.cardId === cardId)
            ? current
            : { ...current, outgoing: [...current.outgoing, outgoingFrom(row, cardId)] })
    }

    function removeOutgoing(cardId: string) {
        setDraft(current => ({ ...current, outgoing: current.outgoing.filter(card => card.cardId !== cardId) }))
    }

    function clearTrade() {
        if (!window.confirm("Clear this trade? Both sides are emptied (nothing in your collection changes).")) return
        setDraft(emptyDraft)
    }

    const isEmpty = draft.incoming.length === 0 && draft.outgoing.length === 0

    return (
        <div className="p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className="mr-auto text-2xl font-bold">Trade</h1>
                <button type="button" onClick={clearTrade} disabled={isEmpty}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
                    Clear trade
                </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <IncomingSide
                    incoming={draft.incoming}
                    quoteItems={quote.items}
                    total={incomingTotal}
                    isPricing={quote.isPricing}
                    quoteError={quote.errorMessage}
                    onAdd={addIncoming}
                    onChange={changeIncoming}
                    onRemove={removeIncoming}
                />
                <OutgoingSide outgoing={draft.outgoing} total={outgoingTotal} onRemove={removeOutgoing} />
            </div>

            {/* The balance, in words, so it's clear which way it leans */}
            <p className="my-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-800" aria-live="polite">
                {isEmpty ? "Add what you're getting, then pick what you're giving from your cards below."
                    : cents(remaining) > 0 ? <>You can still give <strong>{formatPrice(remaining)}</strong> more to even it up. Cards worth more than that are greyed out.</>
                    : cents(remaining) < 0 ? <>You're giving <strong>{formatPrice(-remaining)}</strong> more than you get.</>
                    : <>The trade is <strong>even</strong>.</>}
            </p>

            <TradeOptions personalEntityId={personalEntityId} pickedIds={pickedIds} remaining={remaining} onPick={pickOutgoing} />
        </div>
    )
}
