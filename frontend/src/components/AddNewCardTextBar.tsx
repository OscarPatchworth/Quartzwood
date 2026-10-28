import { useState, type FormEvent } from "react"
import { parseCardInput } from "../utils/addCardParser"
import { getErrorMessage } from "../api/getErrorMessage"
import type { IParsedCardInput } from "../interfaces/IParsedCardInput"
import {
    getApiScryfallAutocomplete,
    getApiScryfallPrinting,
    getApiScryfallSearch,
    getApiScryfallSearchPromo,
    type AddCardDto,
    type ScryfallSearchResultDto as ScryfallCardMatch,
} from "../interfaces/generated.ts"
import { cardImageUrl } from "../utils/cardImageUrl"
import { useDebouncedSearch } from "../hooks/useDebouncedSearch"
import { SearchInput } from "./misc/SearchInput"

// What the bar produces: a card as typed/picked, without a box (where it goes is up to the page)
export type NewCard = Omit<AddCardDto, "boxId">

interface TextBarProps {
    // Does the adding (into a box, onto a trade, ...). Returns the confirmation to show, e.g. "Added 4 × Sol Ring";
    // throwing shows the error instead
    onAdd: (card: NewCard) => Promise<string>
    // Must be unique on the page (the input's id)
    id?: string
    placeholder?: string
    buttonLabel?: string
}

// What the dropdown shows. "kind" says which shape it is, so TypeScript knows which fields exist
type Suggestions =
    | { kind: "names", names: string[] }                       // partial name: pick the card
    | { kind: "printings", printings: ScryfallCardMatch[] }    // exact name / promo: pick the printing
    | { kind: "preview", printing: ScryfallCardMatch | null }  // set code + number: this exact card (null = not found)
    | { kind: "none" }                                          // nothing to look up (e.g. just flags)

interface Lookup {
    parsed: IParsedCardInput
    suggestions: Suggestions
}

// Works out what the typed text means and fetches matching suggestions.
// Everything comes from the local Scryfall data on the server, so this costs no Scryfall API calls
async function lookUp(text: string): Promise<Lookup> {
    const parsed = parseCardInput(text)

    if (parsed.isPRM) {
        const res = await getApiScryfallSearchPromo({
            query: { name: parsed.name, year: parsed.year, setNumber: parsed.setNumber },
        })
        return { parsed, suggestions: { kind: "printings", printings: res.data ?? [] } }
    }

    if (parsed.setCode && parsed.setNumber) {
        try {
            const res = await getApiScryfallPrinting({
                query: { setCode: parsed.setCode, setNumber: parsed.setNumber, isList: parsed.isList },
            })
            return { parsed, suggestions: { kind: "preview", printing: res.data } }
        } catch {
            // 404: no card at that set + number
            return { parsed, suggestions: { kind: "preview", printing: null } }
        }
    }

    if (parsed.name) {
        // A complete name: list its printings. Otherwise suggest names that start with / contain it
        const printings = (await getApiScryfallSearch({ query: { name: parsed.name, year: parsed.year } })).data ?? []
        if (printings.length > 0) return { parsed, suggestions: { kind: "printings", printings } }

        const names = parsed.name.length >= 2
            ? (await getApiScryfallAutocomplete({ query: { q: parsed.name } })).data
            : []
        return { parsed, suggestions: { kind: "names", names } }
    }

    return { parsed, suggestions: { kind: "none" } }
}

export function AddNewCardTextBar({
    onAdd,
    id = "new-card-search",
    placeholder = "Add a card: name, or set + number e.g. IKO-107 -f",
    buttonLabel = "Add card",
}: TextBarProps) {
    const [text, setText] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [addError, setAddError] = useState<string>()
    // "Added 4 × Sol Ring": confirmation after a successful add, cleared when typing again
    const [lastAdded, setLastAdded] = useState<string>()

    // Same search-as-you-type behaviour as the collection search page
    const { result: lookup, errorMessage: lookupError, isSearching, isTooShort } = useDebouncedSearch(text, lookUp)

    function changeText(nextText: string) {
        setText(nextText)
        setAddError(undefined)
        setLastAdded(undefined)
    }

    async function addCard(parsed: IParsedCardInput, printing?: ScryfallCardMatch) {
        const setCode = printing?.setCode ?? parsed.setCode
        const setNumber = printing?.setNumber ?? parsed.setNumber
        if (!setCode || !setNumber) return

        const newCard: NewCard = {
            setCode,
            setNumber,
            name: printing?.name ?? parsed.name ?? null,
            condition: "NM",
            foilType: parsed.foil ? "Traditional" : "None",
            stampType: "None",
            language: "en",
            isProxy: parsed.isProxy,
            isSigned: false,
            isList: parsed.isList,
            alterArtist: parsed.alterArtist ?? null,
            // One request for all copies: the server looks the card up once and saves them together
            quantity: parsed.quantity,
        }

        setIsAdding(true)
        setAddError(undefined)
        try {
            const message = await onAdd(newCard)
            setText("")
            setLastAdded(message)
        } catch (error) {
            setAddError(getErrorMessage(error, `Unable to add ${setCode}-${setNumber}.`))
        } finally {
            setIsAdding(false)
        }
    }

    // A suggested name was picked: put it in place of the partial name, keeping quantity/flags around it
    function pickName(parsed: IParsedCardInput, name: string) {
        changeText(parsed.name && text.includes(parsed.name) ? text.replace(parsed.name, name) : name)
    }

    // Enter: add when it's clear which card is meant
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (isAdding) return

        // Typed fast and hit Enter before the lookup finished: a set code + number is still unambiguous
        if (isSearching || !lookup) {
            const parsed = parseCardInput(text)
            if (parsed.setCode && parsed.setNumber && !parsed.isPRM) await addCard(parsed)
            return
        }

        const { parsed, suggestions } = lookup
        if (suggestions.kind === "preview" && suggestions.printing) await addCard(parsed)
        else if (suggestions.kind === "printings" && suggestions.printings.length === 1) await addCard(parsed, suggestions.printings[0])
        else if (suggestions.kind === "names" && suggestions.names.length === 1) pickName(parsed, suggestions.names[0])
    }

    const showDropdown = text.trim() !== "" && !isTooShort && (lookup || lookupError || addError || isAdding)

    return (
        <div className="relative w-full max-w-2xl">
            <form onSubmit={submit}>
                <SearchInput
                    id={id}
                    label="Card to add"
                    placeholder={placeholder}
                    value={text}
                    onChange={changeText}
                    isSearching={isSearching || isAdding}
                >
                    <button
                        type="submit"
                        disabled={isAdding}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-special px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-special-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-special active:translate-y-px disabled:opacity-60"
                    >
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        {buttonLabel}
                    </button>
                </SearchInput>
            </form>

            {lastAdded && text === "" && (
                <p role="status" className="mt-1 text-right text-xs text-success">{lastAdded}</p>
            )}

            {showDropdown && (
                // While a newer lookup runs, the old suggestions stay visible but dimmed and unclickable,
                // so nothing flickers and you can't add a card for text you've already changed
                <div className={`absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-line bg-panel shadow-lg ${isSearching ? "pointer-events-none opacity-60" : ""}`}>
                    {addError || lookupError ? (
                        <p role="alert" className="px-4 py-3 text-sm font-semibold text-danger">{addError ?? lookupError}</p>
                    ) : isAdding ? (
                        <p className="px-4 py-3 text-sm text-fg-muted">Adding...</p>
                    ) : lookup && (
                        <SuggestionList
                            lookup={lookup}
                            onPickName={name => pickName(lookup.parsed, name)}
                            onPickPrinting={printing => void addCard(lookup.parsed, printing)}
                            onAddPreview={() => void addCard(lookup.parsed)}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

interface SuggestionListProps {
    lookup: Lookup
    onPickName: (name: string) => void
    onPickPrinting: (printing: ScryfallCardMatch) => void
    onAddPreview: () => void
}

function SuggestionList({ lookup, onPickName, onPickPrinting, onAddPreview }: SuggestionListProps) {
    const { parsed, suggestions } = lookup
    const copies = parsed.quantity > 1 ? `${parsed.quantity} × ` : ""

    switch (suggestions.kind) {
        case "names":
            return suggestions.names.length === 0
                ? <Message text={`No cards called "${parsed.name}"`} />
                : (
                    <ul className="max-h-70 divide-y divide-line overflow-y-auto">
                        {suggestions.names.map(name => (
                            <li key={name}>
                                <button type="button" onClick={() => onPickName(name)}
                                    className="w-full px-4 py-2.5 text-left text-sm text-fg hover:bg-surface-muted">
                                    {name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )

        case "printings":
            return suggestions.printings.length === 0
                ? <Message text={`No printings found for "${parsed.name ?? parsed.setNumber}"`} />
                : (
                    <ul className="max-h-70 divide-y divide-line overflow-y-auto">
                        {suggestions.printings.map(card => (
                            <li key={card.scryfallId}>
                                <PrintingRow card={card} label={`${copies}${card.name}`} onClick={() => onPickPrinting(card)} />
                            </li>
                        ))}
                    </ul>
                )

        case "preview":
            return suggestions.printing
                ? <PrintingRow card={suggestions.printing} label={`${copies}${suggestions.printing.name}`} hint="Enter to add" onClick={onAddPreview} />
                : <Message text={`No card at ${parsed.setCode} #${parsed.setNumber}`} />

        case "none":
            return <Message text="Type a card name, or a set code and number" />
    }
}

function PrintingRow({ card, label, hint, onClick }: { card: ScryfallCardMatch, label: string, hint?: string, onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-surface-muted">
            <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-fg">{label}</span>
                <span className="text-xs text-fg-muted">
                    {card.setCode} #{card.setNumber}
                    {hint && <span className="ml-2 text-fg-subtle">· {hint}</span>}
                </span>
            </span>
            <img src={cardImageUrl(card.scryfallId, "small")} alt="" loading="lazy" className="h-16 w-auto shrink-0 rounded" />
        </button>
    )
}

function Message({ text }: { text: string }) {
    return <p className="px-4 py-3 text-sm text-fg-muted">{text}</p>
}
