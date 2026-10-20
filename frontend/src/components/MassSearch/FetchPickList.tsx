import { useState } from "react"
import type { FetchPlanDto } from "../../interfaces/generated.ts"
import { BoxPickList } from "../misc/BoxPickList"
import { FinishFetchDialog, type FetchOutcome } from "./FinishFetchDialog"
import { planItems } from "./massSearchTypes"

interface FetchPickListProps {
    plan: FetchPlanDto
    collected: string[]
    onToggle: (key: string) => void
    onTickAll: (ticked: boolean) => void
    onBack: () => void
    onFinished: (outcome: FetchOutcome) => void
    personalEntityId: string
    rootGroupId: string
}

// The optimized fetch: which copies to take out of which boxes (as few boxes as possible), as a checklist.
// Nothing changes until "Done collecting", and then only the ticked cards are moved or deleted
export function FetchPickList({ plan, collected, onToggle, onTickAll, onBack, onFinished, personalEntityId, rootGroupId }: FetchPickListProps) {
    const [isFinishOpen, setIsFinishOpen] = useState(false)

    const items = planItems(plan)
    const ticked = new Set(collected)
    const tickedIds = items.filter(item => ticked.has(item.key)).flatMap(item => item.ids)
    const total = items.reduce((sum, item) => sum + item.count, 0)
    const boxCount = plan.boxes.length

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="mr-auto text-lg font-bold text-slate-900">Collect the cards</h2>
                <button type="button" onClick={onBack}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    Back to the results
                </button>
                <button type="button" onClick={() => setIsFinishOpen(true)} disabled={tickedIds.length === 0}
                    title={tickedIds.length === 0 ? "Tick the cards as you take them out first" : undefined}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
                    Done collecting
                </button>
            </div>
            <p className="mb-3 max-w-4xl text-sm text-slate-600">
                Open <strong>{boxCount}</strong> {boxCount === 1 ? "box" : "boxes"} to collect <strong>{total}</strong> {total === 1 ? "card" : "cards"}:
                the fewest boxes that have them. Nothing in your collection has changed yet. Tick each card as you take it out,
                then press Done collecting to move or delete the ticked ones. This list stays here if you close the page.
            </p>

            {plan.short.length > 0 && (
                <div role="status" className="mb-3 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-semibold">Not enough copies in your collection:</p>
                    <p>{plan.short.map(s => `${s.name} (${Number(s.found)} of ${Number(s.wanted)})`).join(", ")}</p>
                </div>
            )}

            <BoxPickList
                title="Cards to take out"
                items={items}
                collected={ticked}
                onToggle={onToggle}
                onTickAll={onTickAll}
                emptyText="None of the cards are in your collection."
                className="max-w-4xl border-slate-200"
            />

            {isFinishOpen && (
                <FinishFetchDialog
                    cardIds={tickedIds}
                    untickedCount={total - tickedIds.length}
                    personalEntityId={personalEntityId}
                    rootGroupId={rootGroupId}
                    onClose={() => setIsFinishOpen(false)}
                    onFinished={outcome => { setIsFinishOpen(false); onFinished(outcome) }}
                />
            )}
        </div>
    )
}
