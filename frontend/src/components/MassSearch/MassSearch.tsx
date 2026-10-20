import { useState, type ChangeEvent } from "react"
import { postApiCardsMassSearch, type MassSearchEntryDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { usePersistentState } from "../../hooks/usePersistentState"
import { cardImageUrl } from "../../utils/cardImageUrl"
import { withPopup } from "../hocs/withPopup.tsx"
import { RightLongPopupShape } from "../hocs/Popups/shapes/RightLongPopupShape.tsx"
import { MassSearchCardPanel } from "./MassSearchCardPanel"
import { emptyMassSearch, owned, wantedOf, type MassSearchDraft } from "./massSearchTypes"

const CardPanelPopup = withPopup(MassSearchCardPanel, RightLongPopupShape)

// Biggest file the import button reads (the server takes up to 1,000,000 characters)
const MAX_FILE_BYTES = 1_000_000

type Show = "all" | "short"

// Look up a whole list of cards at once: typed, pasted, or imported from a file (deck list or CSV export).
// Shows each card with how many you have (missing ones in red), and where every copy is.
// The list and its results are kept in this browser until you clear them
export function MassSearch({ userId }: { userId: string }) {
    const [draft, setDraft] = usePersistentState<MassSearchDraft>(`quartzwood.massSearch.${userId}`, emptyMassSearch)
    const [isSearching, setIsSearching] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    // keepWanted: searching the same list again keeps the quantities you changed
    async function search(keepWanted: boolean) {
        setIsSearching(true)
        setErrorMessage(undefined)
        try {
            const res = await postApiCardsMassSearch({ body: { text: draft.text } })
            setDraft(current => ({
                ...current,
                stage: "results",
                result: res.data,
                searchedAt: new Date().toISOString(),
                wanted: Object.fromEntries(res.data.entries.map(entry =>
                    [entry.name, keepWanted ? current.wanted[entry.name] ?? Number(entry.wanted) : Number(entry.wanted)])),
            }))
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Couldn't search for the list. Please try again."))
        } finally {
            setIsSearching(false)
        }
    }

    if (draft.stage === "list" || !draft.result) {
        return (
            <ListInput
                text={draft.text}
                onTextChange={text => setDraft(current => ({ ...current, text }))}
                onSearch={() => void search(false)}
                onBackToResults={draft.result ? () => setDraft(current => ({ ...current, stage: "results" })) : undefined}
                isSearching={isSearching}
                errorMessage={errorMessage}
            />
        )
    }

    return (
        <Results
            draft={draft}
            onWantedChange={(name, quantity) => setDraft(current => ({ ...current, wanted: { ...current.wanted, [name]: quantity } }))}
            onEdit={() => setDraft(current => ({ ...current, stage: "list" }))}
            onSearchAgain={() => void search(true)}
            onClear={() => {
                if (window.confirm("Clear this list and its results?")) setDraft(emptyMassSearch)
            }}
            isSearching={isSearching}
            errorMessage={errorMessage}
        />
    )
}

interface ListInputProps {
    text: string
    onTextChange: (text: string) => void
    onSearch: () => void
    // Set when there are results for an earlier version of the list
    onBackToResults?: () => void
    isSearching: boolean
    errorMessage?: string
}

function ListInput({ text, onTextChange, onSearch, onBackToResults, isSearching, errorMessage }: ListInputProps) {
    const [fileError, setFileError] = useState<string>()

    // The file is read here in the browser and put in the box, so you can check it before searching
    async function importFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        event.target.value = ""   // so picking the same file again still triggers a change
        if (!file) return
        if (file.size > MAX_FILE_BYTES) {
            setFileError("That file is too big: split it into smaller lists.")
            return
        }
        setFileError(undefined)
        onTextChange(await file.text())
    }

    const isEmpty = text.trim().length === 0

    return (
        <form onSubmit={event => { event.preventDefault(); onSearch() }} className="max-w-2xl">
            <label htmlFor="mass-search-list" className="mb-1 block text-sm font-medium text-slate-700">
                Cards to find, one per line
            </label>
            <textarea
                id="mass-search-list"
                value={text}
                onChange={event => onTextChange(event.target.value)}
                rows={14}
                spellCheck={false}
                placeholder={"4 Lightning Bolt\n1 Sol Ring (C21) 263\nCounterspell\n\nPaste a deck list, or import a .txt / .csv export (Moxfield, ManaBox...)"}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm shadow-sm focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/30"
            />
            <p className="mt-1 text-xs text-slate-500">
                No number means 1 copy. Set codes and collector numbers are fine but ignored: any printing counts.
            </p>

            {(errorMessage || fileError) && <p role="alert" className="mt-2 text-sm text-rose-700">{fileError ?? errorMessage}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="submit" disabled={isSearching || isEmpty}
                    className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSearching ? "Searching..." : "Find cards"}
                </button>
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-sky-700/30">
                    Import a file
                    <input type="file" accept=".txt,.csv,.dec,text/plain,text/csv" onChange={event => void importFile(event)} className="sr-only" />
                </label>
                {onBackToResults && (
                    <button type="button" onClick={onBackToResults} className="text-sm font-semibold text-sky-800 hover:underline">
                        Back to the results
                    </button>
                )}
            </div>
        </form>
    )
}

interface ResultsProps {
    draft: MassSearchDraft
    onWantedChange: (name: string, quantity: number) => void
    onEdit: () => void
    onSearchAgain: () => void
    onClear: () => void
    isSearching: boolean
    errorMessage?: string
}

function Results({ draft, onWantedChange, onEdit, onSearchAgain, onClear, isSearching, errorMessage }: ResultsProps) {
    const [show, setShow] = useState<Show>("all")
    // The card whose side panel is open
    const [openEntry, setOpenEntry] = useState<MassSearchEntryDto>()

    const result = draft.result!
    const entries = result.entries
    const isShort = (entry: MassSearchEntryDto) => owned(entry) < wantedOf(draft, entry)
    const shortCount = entries.filter(isShort).length
    const missingCount = entries.filter(entry => owned(entry) === 0).length
    const shown = show === "short" ? entries.filter(isShort) : entries
    const secondaryButton = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"

    return (
        <div>
            {openEntry && <CardPanelPopup show onClose={() => setOpenEntry(undefined)} entry={openEntry} />}

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm text-slate-700" aria-live="polite">
                    <strong>{entries.length - missingCount}</strong> of {entries.length} cards found
                    {shortCount > 0 && <>, <strong>{shortCount}</strong> with fewer copies than wanted</>}
                    {draft.searchedAt && (
                        <span className="text-slate-500"> · searched {new Date(draft.searchedAt).toLocaleString()}</span>
                    )}
                </p>
                <button type="button" onClick={onEdit} className={secondaryButton}>Edit list</button>
                <button type="button" onClick={onSearchAgain} disabled={isSearching} className={secondaryButton}>
                    {isSearching ? "Searching..." : "Search again"}
                </button>
                <button type="button" onClick={onClear} className={secondaryButton}>Clear</button>
            </div>
            {errorMessage && <p role="alert" className="mb-3 text-sm text-rose-700">{errorMessage}</p>}

            {result.skipped.length > 0 && (
                <details className="mb-3 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <summary className="cursor-pointer font-semibold">
                        {result.skipped.length} {result.skipped.length === 1 ? "line" : "lines"} of the list couldn't be read
                    </summary>
                    <ul className="mt-1 space-y-0.5">
                        {result.skipped.map(line => (
                            <li key={line.lineNumber}>Line {line.lineNumber}: <code>{line.text}</code>: {line.reason}</li>
                        ))}
                    </ul>
                </details>
            )}

            <div role="group" aria-label="Show" className="mb-2 inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
                {([["all", `All (${entries.length})`], ["short", `Not enough (${shortCount})`]] as const).map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={show === value} onClick={() => setShow(value)}
                        className={`rounded-md px-3 py-1 font-medium ${show === value ? "bg-sky-800 text-white" : "text-slate-700 hover:bg-slate-50"}`}>
                        {label}
                    </button>
                ))}
            </div>

            {shown.length === 0 ? (
                <p className="text-sm text-slate-600">You have enough copies of every card on the list.</p>
            ) : (
                <ul className={`max-w-4xl divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white ${isSearching ? "opacity-60" : ""}`}>
                    {shown.map(entry => (
                        <EntryRow key={entry.name} entry={entry} wanted={wantedOf(draft, entry)}
                            onWantedChange={quantity => onWantedChange(entry.name, quantity)}
                            onOpen={() => setOpenEntry(entry)} />
                    ))}
                </ul>
            )}
        </div>
    )
}

interface EntryRowProps {
    entry: MassSearchEntryDto
    wanted: number
    onWantedChange: (quantity: number) => void
    onOpen: () => void
}

// One card of the list. Pastel red: you don't have it; amber: fewer copies than wanted
function EntryRow({ entry, wanted, onWantedChange, onOpen }: EntryRowProps) {
    const ownedCount = owned(entry)
    const boxCount = new Set(entry.stacks.map(stack => stack.boxId)).size
    const tone = ownedCount === 0 ? "bg-rose-50" : ownedCount < wanted ? "bg-amber-50" : ""

    return (
        <li className={`flex items-center gap-4 p-3 ${tone}`}>
            <button type="button" onClick={onOpen} className="shrink-0 cursor-pointer" aria-label={`Show where your copies of ${entry.name} are`}>
                {entry.scryfallId ? (
                    <img src={cardImageUrl(entry.scryfallId, "small")} alt="" loading="lazy"
                        className={`h-16 w-auto rounded ${ownedCount === 0 ? "opacity-60" : ""}`} />
                ) : (
                    <div className="flex h-16 w-11 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">?</div>
                )}
            </button>

            <div className="min-w-0 flex-1">
                <button type="button" onClick={onOpen} className="block max-w-full cursor-pointer truncate text-left font-semibold text-slate-900 hover:underline">
                    {entry.name}
                </button>
                <p className={`text-sm ${ownedCount === 0 ? "text-rose-800" : ownedCount < wanted ? "text-amber-900" : "text-slate-600"}`}>
                    {ownedCount === 0
                        ? entry.isKnownCard ? "Not in your collection" : "No card has this name: check the spelling"
                        : <>You have {ownedCount} in {boxCount} {boxCount === 1 ? "box" : "boxes"}{ownedCount < wanted && <>: {wanted - ownedCount} short</>}</>}
                </p>
            </div>

            <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                Want
                <input type="number" min={0} max={1000} value={wanted}
                    onChange={event => onWantedChange(Math.max(0, Math.min(1000, Math.floor(Number(event.target.value) || 0))))}
                    className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-right" />
            </label>
        </li>
    )
}
