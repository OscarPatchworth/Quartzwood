import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getApiCardsSearch, type CardSearchResultDto, type GroupedCardDto } from '../interfaces/generated.ts'
import { useAuth } from '../auth/useAuth'
import { cardImageUrl } from '../utils/cardImageUrl'
import { useDebouncedSearch } from '../hooks/useDebouncedSearch'
import { SearchInput } from '../components/misc/SearchInput'
import { SortMenu } from '../components/misc/SortMenu'
import { useCardSort } from '../hooks/useCardSort'
import { FilterMenu } from '../components/misc/FilterMenu'
import { useCardFilter, hasFilter, describeFilter } from '../hooks/useCardFilter'
import { withPopup } from '../components/hocs/withPopup.tsx'
import { RightLongPopupShape } from '../components/hocs/Popups/shapes/RightLongPopupShape.tsx'
import { CardEditController } from '../components/Cards/CardEditController.tsx'

// The same details/edit panel as the box page
const CardDetailsPopup = withPopup(CardEditController, RightLongPopupShape)

// The panel works on a stack of identical cards: give it just the result's first copy, so it shows
// (and edits) that one card rather than every copy in the box
function singleCard(result: CardSearchResultDto): GroupedCardDto {
    return {
        name: result.name,
        setCode: result.setCode,
        setNumber: result.setNumber,
        scryfallId: result.scryfallId,
        condition: result.condition,
        foilType: result.foilType,
        stampType: result.stampType,
        count: 1,
        ids: result.ids.slice(0, 1),
        tags: result.tags,
    }
}

const MIN_LENGTH = 2

// Searches every card the user owns and shows where each one is
export default function SearchPage() {
    // The search lives in the URL (?q=...), so Back from a box returns to the same results
    const [searchParams, setSearchParams] = useSearchParams()
    const [text, setText] = useState(searchParams.get('q') ?? '')
    const { sort, desc, setSort } = useCardSort()
    const { filter, setFilter } = useCardFilter()
    const isFiltered = hasFilter(filter)
    // The card whose details panel is open
    const [openCard, setOpenCard] = useState<GroupedCardDto>()
    // Bumped after an edit/delete in the panel: part of the search key below, so the search runs again
    const [refreshCount, setRefreshCount] = useState(0)

    // Debounce, ignoring out-of-date answers and errors all live in the shared hook.
    // key: changing the sort or filter runs the search again (the server filters and sorts every match,
    // then returns the first 200). With a filter, any text works, even none: "every card with mana value 2-4"
    const { result: response, resultQuery, errorMessage, isSearching, isTooShort } = useDebouncedSearch(
        text,
        async query => (await getApiCardsSearch({ query: { q: query, sort, desc, ...filter } })).data,
        { minLength: isFiltered ? 0 : MIN_LENGTH, key: `${sort}|${desc}|${JSON.stringify(filter)}|${refreshCount}` },
    )
    const query = text.trim()

    // Once a search has finished, put its text in the URL. Merged into the current parameters
    // (a function of `current`), so the ?sort= the sort menu put there stays
    useEffect(() => {
        if (!resultQuery) return
        setSearchParams(current => {
            const params = new URLSearchParams(current)
            params.set('q', resultQuery)
            return params
        }, { replace: true })
    }, [resultQuery, setSearchParams])

    function changeText(nextText: string) {
        setText(nextText)
        // Too short to search: drop ?q= so Back/refresh don't bring an old search back
        if (nextText.trim().length < MIN_LENGTH && searchParams.has('q')) {
            setSearchParams(current => {
                const params = new URLSearchParams(current)
                params.delete('q')
                return params
            }, { replace: true })
        }
    }

    const results = response?.results ?? []
    const copyCount = results.reduce((total, result) => total + Number(result.count), 0)

    // After an edit or delete: close the panel and search again, so the list shows the change
    async function afterCardChanged() {
        setOpenCard(undefined)
        setRefreshCount(count => count + 1)
    }

    return (
        <div className="p-8">
            {openCard && (
                <CardDetailsPopup
                    show
                    onClose={() => setOpenCard(undefined)}
                    cards={openCard}
                    onMutationComplete={afterCardChanged}
                />
            )}

            <h1 className="mb-4 text-2xl font-bold">Search your collection</h1>

            <div className="flex max-w-2xl items-center gap-2">
                <div className="min-w-0 flex-1">
                    <SearchInput
                        id="collection-search"
                        label="Search your collection"
                        placeholder="Card name or set code, e.g. sol ring or LEA"
                        value={text}
                        onChange={changeText}
                        isSearching={isSearching}
                        autoFocus
                    />
                </div>
                <FilterMenu value={filter} onChange={setFilter} />
                <SortMenu value={{ sort, desc }} onChange={setSort} />
            </div>

            <div className="mt-2 min-h-5 text-sm text-slate-600" aria-live="polite">
                {isTooShort ? (
                    query.length > 0 && `Type at least ${MIN_LENGTH} characters, or set a filter.`
                ) : errorMessage ? (
                    <span role="alert" className="text-rose-700">{errorMessage}</span>
                ) : isSearching && !response ? (
                    "Searching..."
                ) : response && results.length === 0 ? (
                    // e.g. 'No cards matching "bolt" with MV 5+.' or, with no text, 'No cards with MV 5+.'
                    `No cards ${resultQuery ? `matching "${resultQuery}"` : ""}${resultQuery && isFiltered ? " " : ""}${isFiltered ? `with ${describeFilter(filter)}` : ""}.`
                ) : response && (
                    <>
                        {copyCount} {copyCount === 1 ? "card" : "cards"} in {results.length} {results.length === 1 ? "place" : "places"}
                        {isFiltered && ` with ${describeFilter(filter)}`}
                        {response.hasMore && " (showing the first matches only: try a longer search)"}
                    </>
                )}
            </div>

            {results.length > 0 && (
                <ul className={`mt-4 max-w-4xl divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white ${isSearching ? "opacity-60" : ""}`}>
                    {results.map(result => (
                        <SearchResultRow key={`${result.boxId}-${result.ids[0]}`} result={result} onOpen={() => setOpenCard(singleCard(result))} />
                    ))}
                </ul>
            )}
        </div>
    )
}

// onOpen: show this card's details panel (the image and the name open it; the box link is in the breadcrumbs)
function SearchResultRow({ result, onOpen }: { result: CardSearchResultDto, onOpen: () => void }) {
    const { account } = useAuth()

    return (
        <li className="flex items-center gap-4 p-3">
            <button type="button" onClick={onOpen} className="relative shrink-0 cursor-pointer" aria-label={`Show details of ${result.name ?? "this card"}`}>
                {result.scryfallId ? (
                    <img
                        src={cardImageUrl(result.scryfallId, "small")}
                        alt=""
                        loading="lazy"
                        className="h-16 w-auto rounded"
                    />
                ) : (
                    // Manually-named cards have no Scryfall image
                    <div className="flex h-16 w-11 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">?</div>
                )}
                {Number(result.count) > 1 && (
                    <span className="absolute -left-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-800 px-1 text-xs font-bold text-white">
                        {result.count}
                    </span>
                )}
            </button>

            <div className="min-w-0">
                <button
                    type="button"
                    onClick={onOpen}
                    className="block max-w-full cursor-pointer truncate text-left font-semibold text-slate-900 hover:underline"
                >
                    {result.name ?? "Unnamed card"}
                </button>
                <p className="text-xs text-slate-500">
                    {[result.setCode && `${result.setCode} #${result.setNumber}`, result.condition,
                      result.foilType !== "None" && result.foilType, result.stampType !== "None" && result.stampType]
                        .filter(Boolean).join(" ⋆ ")}
                </p>

                {/* Where it is: Collection › Binders › Binder 1 › Page 1 */}
                <nav aria-label="Location" className="mt-1 flex flex-wrap items-center gap-1 text-sm">
                    {result.groupPath.map(step => (
                        <span key={step.id} className="flex items-center gap-1">
                            <Link
                                to={step.id === account?.rootGroupId ? "/collection" : `/group/${step.id}`}
                                className="text-sky-800 hover:underline"
                            >
                                {step.name}
                            </Link>
                            <span className="text-slate-400">›</span>
                        </span>
                    ))}
                    <Link to={`/box/${result.boxId}`} className="font-medium text-sky-800 hover:underline">
                        {result.boxName}
                    </Link>
                </nav>
            </div>
        </li>
    )
}
