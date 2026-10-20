import type { LocationStepDto } from "../../interfaces/generated.ts"
import { cardImageUrl } from "../../utils/cardImageUrl"
import { formatPrice } from "../../utils/formatPrice"

// One line of a pick list: `count` identical copies to take out of one box
export interface PickItem {
    key: string
    name: string | null
    setCode: string | null
    setNumber: string | null
    scryfallId: string | null
    condition: string
    foilType: string
    // Each copy's price; null = no price
    price: number | null
    count: number
    boxId: string
    boxName: string
    groupPath: LocationStepDto[]
}

interface BoxPickListProps {
    title: string
    items: PickItem[]
    // Keys of the lines ticked off
    collected: ReadonlySet<string>
    onToggle: (key: string) => void
    onTickAll: (ticked: boolean) => void
    emptyText: string
    className?: string
}

// A checklist of cards to fetch, grouped by the box they're in (boxes in location order, so you can go
// box by box), each line with a tick box. Used by the trade page and by fetching a list
export function BoxPickList({ title, items, collected, onToggle, onTickAll, emptyText, className = "" }: BoxPickListProps) {
    const byBox = groupByBox(items)
    const total = items.reduce((sum, item) => sum + item.count, 0)
    const collectedCount = items.filter(item => collected.has(item.key)).reduce((sum, item) => sum + item.count, 0)
    const allTicked = items.length > 0 && items.every(item => collected.has(item.key))

    return (
        <section aria-label={title} className={`rounded-lg border bg-white p-4 ${className}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
                <h2 className="mr-auto text-lg font-bold text-slate-900">{title}</h2>
                <span className="text-sm text-slate-600" aria-live="polite">{collectedCount} of {total} collected</span>
                {items.length > 0 && (
                    <button type="button" onClick={() => onTickAll(!allTicked)} className="text-sm font-semibold text-sky-800 hover:underline">
                        {allTicked ? "Untick all" : "Tick all"}
                    </button>
                )}
            </div>

            {items.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}

            {byBox.map(({ boxId, boxName, path, items: boxItems }) => (
                <div key={boxId} className="mb-4 last:mb-0">
                    <h3 className="font-semibold text-slate-900">{boxName}</h3>
                    <p className="mb-1 text-xs text-slate-500">{path}</p>
                    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                        {boxItems.map(item => {
                            const isCollected = collected.has(item.key)
                            return (
                                <li key={item.key}>
                                    <label className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${isCollected ? "bg-emerald-50" : ""}`}>
                                        <input type="checkbox" checked={isCollected} onChange={() => onToggle(item.key)}
                                            className="size-5 shrink-0 accent-emerald-600" />
                                        {item.scryfallId && (
                                            <img src={cardImageUrl(item.scryfallId, "small")} alt="" loading="lazy" className="h-12 w-auto shrink-0 rounded" />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-sm font-semibold ${isCollected ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                                {item.count > 1 && `${item.count} × `}{item.name ?? "Unnamed card"}
                                            </span>
                                            <span className="block text-xs text-slate-500">
                                                {[item.setCode && `${item.setCode} #${item.setNumber}`, item.condition,
                                                  item.foilType !== "None" && item.foilType].filter(Boolean).join(" ⋆ ")}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-sm text-slate-700">{item.price !== null ? formatPrice(item.price) : ""}</span>
                                    </label>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}
        </section>
    )
}

// Boxes in the order their locations sort ("Collection › Binders › A" before "... › B"), cards A-Z in each
function groupByBox(items: PickItem[]) {
    const boxes = new Map<string, PickItem[]>()
    for (const item of items) boxes.set(item.boxId, [...(boxes.get(item.boxId) ?? []), item])

    return [...boxes.values()]
        .map(boxItems => ({
            boxId: boxItems[0].boxId,
            boxName: boxItems[0].boxName,
            path: boxItems[0].groupPath.map(step => step.name).join(" › "),
            items: [...boxItems].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
        }))
        .sort((a, b) => `${a.path} › ${a.boxName}`.localeCompare(`${b.path} › ${b.boxName}`))
}
