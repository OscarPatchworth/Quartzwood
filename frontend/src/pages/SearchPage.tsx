import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getApiCardsSearch, type CardSearchResponseDto, type CardSearchResultDto } from '../interfaces/generated.ts'
import { getErrorMessage } from '../api/getErrorMessage'
import { useAuth } from '../auth/useAuth'
import { cardImageUrl } from '../utils/cardImageUrl'

const MIN_LENGTH = 2
// Wait this long after the last keystroke before searching, so typing "sol ring" is 1 request, not 8
const DEBOUNCE_MS = 300

// Searches every card the user owns and shows where each one is
export default function SearchPage() {
    // The search lives in the URL (?q=...), so Back from a box returns to the same results
    const [searchParams, setSearchParams] = useSearchParams()
    const [text, setText] = useState(searchParams.get('q') ?? '')
    const [response, setResponse] = useState<CardSearchResponseDto>()
    const [isSearching, setIsSearching] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()
    // Only the newest request may update the page: an older, slower one must not overwrite it
    const latestRequest = useRef(0)

    const query = text.trim()
    const isTooShort = query.length < MIN_LENGTH

    function changeText(nextText: string) {
        setText(nextText)
        // Too short to search: drop ?q= so Back/refresh don't bring an old search back.
        // Longer text is written to the URL by the debounced search below
        if (nextText.trim().length < MIN_LENGTH && searchParams.has('q')) {
            setSearchParams({}, { replace: true })
        }
    }

    useEffect(() => {
        if (isTooShort) return

        const timer = setTimeout(async () => {
            const requestId = ++latestRequest.current
            setSearchParams({ q: query }, { replace: true })
            setIsSearching(true)
            setErrorMessage(undefined)
            try {
                const res = await getApiCardsSearch({ query: { q: query } })
                if (requestId === latestRequest.current) setResponse(res.data)
            } catch (error) {
                if (requestId === latestRequest.current) setErrorMessage(getErrorMessage(error, "Search failed."))
            } finally {
                if (requestId === latestRequest.current) setIsSearching(false)
            }
        }, DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [query, isTooShort, setSearchParams])

    const results = isTooShort ? [] : response?.results ?? []
    const copyCount = results.reduce((total, result) => total + Number(result.count), 0)

    return (
        <div className="p-8">
            <h1 className="mb-4 text-2xl font-bold">Search your collection</h1>

            <input
                type="search"
                autoFocus
                value={text}
                onChange={event => changeText(event.target.value)}
                placeholder="Card name or set code, e.g. sol ring or LEA"
                aria-label="Search your collection"
                className="w-full max-w-2xl rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20"
            />

            <div className="mt-2 min-h-5 text-sm text-slate-600" aria-live="polite">
                {isTooShort ? (
                    query.length > 0 && `Type at least ${MIN_LENGTH} characters.`
                ) : errorMessage ? (
                    <span role="alert" className="text-rose-700">{errorMessage}</span>
                ) : isSearching && !response ? (
                    "Searching..."
                ) : response && results.length === 0 ? (
                    `No cards matching "${query}".`
                ) : response && (
                    <>
                        {copyCount} {copyCount === 1 ? "card" : "cards"} in {results.length} {results.length === 1 ? "place" : "places"}
                        {response.hasMore && " (showing the first matches only: try a longer search)"}
                    </>
                )}
            </div>

            {results.length > 0 && (
                <ul className={`mt-4 max-w-4xl divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white ${isSearching ? "opacity-60" : ""}`}>
                    {results.map(result => (
                        <SearchResultRow key={`${result.boxId}-${result.ids[0]}`} result={result} />
                    ))}
                </ul>
            )}
        </div>
    )
}

function SearchResultRow({ result }: { result: CardSearchResultDto }) {
    const { account } = useAuth()

    return (
        <li className="flex items-center gap-4 p-3">
            <Link to={`/box/${result.boxId}`} className="relative shrink-0" aria-label={`Open ${result.boxName}`}>
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
            </Link>

            <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                    {result.name ?? "Unnamed card"}
                </p>
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
