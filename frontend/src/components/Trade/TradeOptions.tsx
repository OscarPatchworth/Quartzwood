import { useState } from "react"
import { getApiTradeOptions, type CardSearchResultDto } from "../../interfaces/generated.ts"
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch"
import { useCardSort } from "../../hooks/useCardSort"
import { useCardFilter } from "../../hooks/useCardFilter"
import { SearchInput } from "../misc/SearchInput"
import { SortMenu } from "../misc/SortMenu"
import { FilterMenu } from "../misc/FilterMenu"
import { TagList } from "../Tags/TagList"
import { cardImageUrl } from "../../utils/cardImageUrl"
import { formatPrice } from "../../utils/formatPrice"
import { LocationPicker, type Location } from "./LocationPicker"
import { cents, toPrice } from "./tradeTypes"

interface TradeOptionsProps {
    personalEntityId: string
    // Card ids already on Side 2: those copies aren't offered again
    pickedIds: ReadonlySet<string>
    // What's left to give: You receive - You give. Cards priced above it are greyed out and moved down
    remaining: number
    onPick: (row: CardSearchResultDto, cardId: string) => void
}

// Your collection's cards with prices: click one to put ONE copy on Side 2.
// Text, location, filters and sort are all applied by the server (same rules as collection search)
export function TradeOptions({ personalEntityId, pickedIds, remaining, onPick }: TradeOptionsProps) {
    const [text, setText] = useState("")
    const [location, setLocation] = useState<Location>({})
    const { sort, desc, setSort } = useCardSort()
    const { filter, setFilter } = useCardFilter()

    // minLength 0: no text = the whole (filtered) collection. key: changing anything else loads again
    const { result, errorMessage, isSearching } = useDebouncedSearch(
        text,
        async q => (await getApiTradeOptions({ query: { q, sort, desc, ...filter, ...location } })).data,
        { minLength: 0, key: `${sort}|${desc}|${JSON.stringify(filter)}|${location.groupId}|${location.boxId}` },
    )

    // Copies still available (not already on Side 2); stacks with none left are hidden
    const rows = (result?.results ?? [])
        .map(row => ({ row, price: toPrice(row.price), availableIds: row.ids.filter(id => !pickedIds.has(id)) }))
        .filter(x => x.availableIds.length > 0)
        .map(x => ({ ...x, isOver: x.price !== null && cents(x.price) > cents(remaining) }))
    // Affordable first, greyed ones after, each half keeping the server's sort order
    const ordered = [...rows.filter(x => !x.isOver), ...rows.filter(x => x.isOver)]

    return (
        <section aria-labelledby="options-title" className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 id="options-title" className="mr-auto text-lg font-bold text-slate-900">Trade options</h2>
                <LocationPicker entityId={personalEntityId} value={location} onChange={setLocation} />
                <FilterMenu value={filter} onChange={setFilter} />
                <SortMenu value={{ sort, desc }} onChange={setSort} />
            </div>
            <div className="max-w-xl">
                <SearchInput id="trade-options-search" label="Search your cards" placeholder="Search your cards by name or set code"
                    value={text} onChange={setText} isSearching={isSearching} />
            </div>

            <p className="mt-2 min-h-5 text-sm text-slate-600" aria-live="polite">
                {errorMessage ? <span role="alert" className="text-rose-700">{errorMessage}</span>
                    : result && ordered.length === 0 ? "No cards to offer with these filters."
                    : result?.hasMore ? "Showing the first 500: narrow it down with the search or filters." : null}
            </p>

            <ul className={`mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${isSearching ? "opacity-60" : ""}`}>
                {ordered.map(({ row, price, availableIds, isOver }) => (
                    <li key={`${row.boxId}-${row.ids[0]}`} className={isOver ? "opacity-40 grayscale hover:opacity-70" : ""}>
                        <button
                            type="button"
                            onClick={() => onPick(row, availableIds[0])}
                            title={isOver ? "Worth more than what's left to give: you can still add it" : "Add one copy to 'You give'"}
                            className="relative flex w-full flex-col items-center rounded-lg p-1 text-left transition hover:bg-slate-50"
                        >
                            {/* The price, big: a span (a heading isn't allowed inside a button) */}
                            <span className="mb-1 text-base font-bold text-slate-900">{price !== null ? formatPrice(price) : "No price"}</span>
                            {row.scryfallId ? (
                                <img src={cardImageUrl(row.scryfallId)} alt={row.name ?? ""} loading="lazy" className="w-full rounded-lg shadow" />
                            ) : (
                                <div className="flex aspect-[5/7] w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">{row.name}</div>
                            )}
                            {availableIds.length > 1 && (
                                <span className="absolute left-2 top-9 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/80 px-1 text-sm font-bold text-black">
                                    {availableIds.length}
                                </span>
                            )}
                            <span className="mt-1 text-center text-xs">{row.name} ⋆ {row.condition}{row.foilType !== "None" && ` ⋆ ${row.foilType}`}</span>
                            <span className="text-center text-xs text-slate-500">{row.boxName}</span>
                        </button>
                        <TagList tags={row.tags} className="mt-1 justify-center" />
                    </li>
                ))}
            </ul>
        </section>
    )
}
