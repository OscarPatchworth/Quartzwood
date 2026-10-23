import { Link } from "react-router-dom"
import type { MassSearchEntryDto } from "../../interfaces/generated.ts"
import { cardImageUrl } from "../../utils/cardImageUrl"
import { formatPrice } from "../../utils/formatPrice"
import { TagList } from "../Tags/TagList"
import { groupByBox } from "./massSearchTypes"

// The side panel for one card of the list: every copy you have, printing by printing, under the box it's in
export function MassSearchCardPanel({ entry }: { entry: MassSearchEntryDto }) {
    const boxes = groupByBox(entry.stacks)
    const ownedCount = Number(entry.owned)

    return (
        <div>
            <h2 className="mb-3 pr-6 text-heading text-fg">{entry.name}</h2>
            {entry.scryfallId && (
                <img src={cardImageUrl(entry.scryfallId)} alt="" className="mx-auto mb-3 w-56 rounded-lg shadow" />
            )}
            <p className="mb-4 text-sm text-fg-muted">
                {ownedCount === 0
                    ? entry.isKnownCard ? "You don't have this card." : "No card has this name on Scryfall: check the spelling."
                    : <>You have <strong>{ownedCount}</strong> {ownedCount === 1 ? "copy" : "copies"} in {boxes.length} {boxes.length === 1 ? "box" : "boxes"}.</>}
            </p>

            {boxes.map(box => (
                <section key={box.boxId} className="mb-4">
                    <Link to={`/box/${box.boxId}`} className="font-semibold text-link hover:underline">{box.boxName}</Link>
                    <p className="mb-1 text-xs text-fg-subtle">{box.path}</p>
                    <ul className="divide-y divide-line rounded-md border border-line">
                        {box.rows.map(row => (
                            <li key={row.ids[0]} className="flex items-center gap-3 px-3 py-2">
                                {row.scryfallId ? (
                                    <img src={cardImageUrl(row.scryfallId, "small")} alt="" loading="lazy" className="h-14 w-auto shrink-0 rounded" />
                                ) : (
                                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-surface-sunken text-xs text-fg-subtle">?</div>
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-fg">
                                        {Number(row.count)} × {row.setCode ? `${row.setCode} #${row.setNumber}` : "No printing"}
                                    </span>
                                    <span className="block text-xs text-fg-subtle">
                                        {[row.condition, row.foilType !== "None" && row.foilType, row.stampType !== "None" && row.stampType]
                                            .filter(Boolean).join(" ⋆ ")}
                                    </span>
                                    {row.dividerName && (
                                        <span className="block text-xs font-medium text-link">Behind {row.dividerName}</span>
                                    )}
                                    <TagList tags={row.tags} className="mt-1" />
                                </span>
                                <span className="shrink-0 text-sm text-fg-muted">
                                    {row.price !== null && row.price !== undefined ? formatPrice(Number(row.price)) : ""}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    )
}
