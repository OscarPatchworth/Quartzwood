import { useState } from "react"
import { postApiTrade, type TradeResultDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import type { TradeDraft } from "./tradeTypes"

interface FinishTradeDialogProps {
    draft: TradeDraft
    onClose: () => void
    onFinished: (result: TradeResultDto) => void
}

// "Are you sure?" before the trade changes your collection, saying exactly what will happen.
// The server does it all or nothing: if it fails, nothing has changed and the trade is still here
export function FinishTradeDialog({ draft, onClose, onFinished }: FinishTradeDialogProps) {
    const [isFinishing, setIsFinishing] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    const receiving = draft.incoming.reduce((sum, item) => sum + Number(item.card.quantity ?? 1), 0)
    const giving = draft.outgoing.length
    const collected = new Set(draft.collected)
    const notCollected = draft.outgoing.filter(card => !collected.has(card.cardId)).length

    async function finish() {
        setIsFinishing(true)
        setErrorMessage(undefined)
        try {
            const res = await postApiTrade({
                body: {
                    incoming: draft.incoming.map(item => item.card),
                    outgoingCardIds: draft.outgoing.map(card => card.cardId),
                },
            })
            onFinished(res.data)
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "The trade couldn't be finished. Nothing was changed."))
            setIsFinishing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onMouseDown={() => !isFinishing && onClose()}>
            <div role="dialog" aria-modal="true" aria-labelledby="finish-title"
                onMouseDown={event => event.stopPropagation()}
                className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 id="finish-title" className="text-lg font-semibold text-slate-900">Finish this trade?</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {receiving > 0 && <li>Add <strong>{receiving}</strong> {receiving === 1 ? "card" : "cards"} to 'Cards from Trade' in your collection</li>}
                    {giving > 0 && <li>Remove <strong>{giving}</strong> {giving === 1 ? "card" : "cards"} you're giving from your collection</li>}
                </ul>
                {notCollected > 0 && (
                    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {notCollected} {notCollected === 1 ? "card isn't" : "cards aren't"} ticked as collected yet.
                    </p>
                )}
                <p className="mt-3 text-sm text-slate-500">This can't be undone.</p>

                {errorMessage && <p role="alert" className="mt-3 text-sm text-rose-700">{errorMessage}</p>}

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" disabled={isFinishing} onClick={onClose}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="button" disabled={isFinishing} onClick={() => void finish()}
                        className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                        {isFinishing ? "Finishing..." : "Finish trade"}
                    </button>
                </div>
            </div>
        </div>
    )
}
