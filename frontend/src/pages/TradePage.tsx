import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CardSearchResultDto, TradeCardDto, TradeResultDto } from '../interfaces/generated.ts'
import { useAuth } from '../auth/useAuth'
import { usePersistentState } from '../hooks/usePersistentState'
import { LoadingIndicator } from '../components/misc/LoadingIndicator.tsx'
import type { NewCard } from '../components/AddNewCardTextBar'
import { IncomingSide } from '../components/Trade/IncomingSide'
import { OutgoingSide } from '../components/Trade/OutgoingSide'
import { TradeOptions } from '../components/Trade/TradeOptions'
import { useTradeQuote } from '../components/Trade/useTradeQuote'
import { PickList } from '../components/Trade/PickList'
import { FinishTradeDialog } from '../components/Trade/FinishTradeDialog'
import { cents, emptyDraft, outgoingFrom, type TradeDraft } from '../components/Trade/tradeTypes'
import { formatPrice } from '../utils/formatPrice'

// A trade in three steps:
//  1. Build: what you receive (Side 1), what you give (Side 2, picked from Trade Options below)
//  2. Collect: a pick list of the cards you're giving, by box, to tick off as you fetch them
//  3. Finish: confirm, then the server adds and removes the cards (all or nothing)
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
    const [isFinishOpen, setIsFinishOpen] = useState(false)
    // Set once the trade is done: shows the summary (the draft itself is cleared)
    const [finished, setFinished] = useState<TradeResultDto>()

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

    function toggleCollected(cardId: string) {
        setDraft(current => ({
            ...current,
            collected: current.collected.includes(cardId)
                ? current.collected.filter(id => id !== cardId)
                : [...current.collected, cardId],
        }))
    }

    function tickAll(ticked: boolean) {
        setDraft(current => ({ ...current, collected: ticked ? current.outgoing.map(card => card.cardId) : [] }))
    }

    function onFinished(result: TradeResultDto) {
        setIsFinishOpen(false)
        setDraft(emptyDraft)
        setFinished(result)
    }

    const isEmpty = draft.incoming.length === 0 && draft.outgoing.length === 0
    // Finishing would fail on a card the server can't find, so it has to be fixed (or removed) first
    const problemCount = quote.items.filter(item => item.error).length
    const canConfirm = !isEmpty && !quote.isPricing && problemCount === 0
    const secondaryButton = "rounded-lg border border-button-line bg-button px-4 py-2 text-sm font-semibold text-button-fg shadow-sm hover:bg-button-hover disabled:opacity-50"
    const primaryButton = "rounded-lg bg-success-solid px-4 py-2 text-sm font-semibold text-on-accent shadow-sm hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-50"

    if (finished) {
        const added = Number(finished.cardsAdded)
        const removed = Number(finished.cardsRemoved)
        return (
            <div className="p-4 sm:p-8">
                <h1 className="mb-4 text-title">Trade done</h1>
                <div className="max-w-xl rounded-lg border border-success-line bg-success-soft p-4 text-sm text-fg" role="status">
                    {added > 0 && (
                        <p>
                            Added <strong>{added}</strong> {added === 1 ? "card" : "cards"} to{" "}
                            <Link to={`/box/${finished.boxId}`} className="font-semibold text-link hover:underline">{finished.boxName}</Link>.
                        </p>
                    )}
                    {removed > 0 && (
                        <p>Removed <strong>{removed}</strong> {removed === 1 ? "card" : "cards"} from your collection.</p>
                    )}
                </div>
                <button type="button" onClick={() => setFinished(undefined)} className={`mt-4 ${primaryButton}`}>
                    Start a new trade
                </button>
            </div>
        )
    }

    if (draft.stage === "collecting") {
        return (
            <div className="p-4 sm:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h1 className="mr-auto text-title">Trade: collect the cards</h1>
                    <button type="button" onClick={() => setDraft(current => ({ ...current, stage: "building" }))} className={secondaryButton}>
                        Back to editing
                    </button>
                    <button type="button" onClick={() => setIsFinishOpen(true)} className={primaryButton}>
                        Finish trade
                    </button>
                </div>
                <p className="mb-4 text-sm text-fg-muted">
                    Nothing in your collection has changed yet. Tick each card off as you take it out of its box,
                    then press Finish trade. This list stays here if you close the page.
                </p>
                <PickList
                    outgoing={draft.outgoing}
                    incoming={draft.incoming}
                    quoteItems={quote.items}
                    collected={new Set(draft.collected)}
                    onToggle={toggleCollected}
                    onTickAll={tickAll}
                />
                {isFinishOpen && <FinishTradeDialog draft={draft} onClose={() => setIsFinishOpen(false)} onFinished={onFinished} />}
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className="mr-auto text-title">Trade</h1>
                <button type="button" onClick={clearTrade} disabled={isEmpty} className={secondaryButton}>
                    Clear trade
                </button>
                <button type="button" disabled={!canConfirm} className={primaryButton}
                    title={problemCount > 0 ? "Fix or remove the cards with a problem first" : undefined}
                    onClick={() => setDraft(current => ({ ...current, stage: "collecting" }))}>
                    Confirm trade
                </button>
            </div>
            {problemCount > 0 && (
                <p role="alert" className="mb-4 text-sm text-danger">
                    {problemCount === 1
                        ? "1 card you'd receive has a problem (shown in red): fix or remove it to continue."
                        : `${problemCount} cards you'd receive have problems (shown in red): fix or remove them to continue.`}
                </p>
            )}

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
            <p className="my-4 rounded-lg bg-surface-sunken px-4 py-3 text-sm text-fg" aria-live="polite">
                {isEmpty ? "Add what you're getting, then pick what you're giving from your cards below."
                    : cents(remaining) > 0 ? <>You can still give <strong>{formatPrice(remaining)}</strong> more to even it up. Cards worth more than that are greyed out.</>
                    : cents(remaining) < 0 ? <>You're giving <strong>{formatPrice(-remaining)}</strong> more than you get.</>
                    : <>The trade is <strong>even</strong>.</>}
            </p>

            <TradeOptions personalEntityId={personalEntityId} pickedIds={pickedIds} remaining={remaining} onPick={pickOutgoing} />
        </div>
    )
}
