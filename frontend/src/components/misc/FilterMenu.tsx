import { useRef, useState, type FormEvent } from "react"
import { describeFilter, FilterRanges, hasFilter, type CardFilter } from "../../hooks/useCardFilter"
import { useMyTags } from "../../hooks/useMyTags"
import { TagInput } from "../Tags/TagInput"

interface FilterMenuProps {
    value: CardFilter
    onChange: (next: CardFilter) => void
}

// What's typed but not applied yet, per range key; text, so a half-typed or empty box is allowed
type Drafts = Record<Exclude<keyof CardFilter, "tags">, string>

const inputClassName = "w-24 rounded-md border border-line-strong px-2 py-1.5 text-sm text-fg focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent-line/20"

// "Filter" button + dropdown with an "At least / At most" pair for each range (mana value, price).
// Applied with the Apply button or Enter (not on every keystroke: typing "10" shouldn't load the cards for
// "1" first). Shows the active filters on the button
export function FilterMenu({ value, onChange }: FilterMenuProps) {
    const menu = useRef<HTMLDetailsElement>(null)
    const [drafts, setDrafts] = useState<Drafts>({ mvMin: "", mvMax: "", priceMin: "", priceMax: "" })
    const [draftTags, setDraftTags] = useState<string[]>([])
    const [error, setError] = useState<string>()
    const { tags: myTags } = useMyTags()

    const isActive = hasFilter(value)
    const toNumber = (text: string) => text.trim() === "" ? undefined : Number(text)

    // Opening the menu starts the drafts from the filters applied now
    function onToggle() {
        if (!menu.current?.open) return
        setDrafts({
            mvMin: value.mvMin?.toString() ?? "",
            mvMax: value.mvMax?.toString() ?? "",
            priceMin: value.priceMin?.toString() ?? "",
            priceMax: value.priceMax?.toString() ?? "",
        })
        setDraftTags(value.tags ?? [])
        setError(undefined)
    }

    function apply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const next: CardFilter = {}
        for (const range of FilterRanges) {
            const min = toNumber(drafts[range.min])
            const max = toNumber(drafts[range.max])
            if ([min, max].some(n => n !== undefined && (!Number.isFinite(n) || n < 0))) {
                setError(`${range.label}: values must be 0 or more.`)
                return
            }
            if (min !== undefined && max !== undefined && min > max) {
                setError(`${range.label}: 'At least' is higher than 'at most'.`)
                return
            }
            next[range.min] = min
            next[range.max] = max
        }
        next.tags = draftTags.length > 0 ? draftTags : undefined
        onChange(next)
        menu.current?.removeAttribute("open")
    }

    function clear() {
        onChange({})
        menu.current?.removeAttribute("open")
    }

    return (
        <details ref={menu} className="relative" onToggle={onToggle}>
            <summary
                title="Filter cards"
                className={`inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm ${
                    isActive
                        ? "border-accent-line bg-accent-soft text-accent-ink hover:bg-accent-soft"
                        : "border-line-strong bg-surface text-fg-muted hover:bg-surface-muted"
                }`}
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M3 4h14l-5.5 6.5V16l-3-1.5v-4L3 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                {describeFilter(value) ?? "Filter"}
            </summary>
            <form
                onSubmit={apply}
                className="absolute right-0 z-40 mt-1 w-72 rounded-lg border border-line bg-surface p-4 shadow-lg"
            >
                {FilterRanges.map(range => (
                    <fieldset key={range.label} className="mb-4">
                        <legend className="mb-2 text-sm font-semibold text-fg">{range.label}</legend>
                        {/* Two rows, so one-sided ranges are obvious: fill in just "At least" for 3+ */}
                        <div className="grid grid-cols-[5rem_auto] items-center gap-x-3 gap-y-2 text-sm text-fg-muted">
                            {([["At least", range.min], ["At most", range.max]] as const).map(([label, key]) => (
                                <label key={key} className="contents">
                                    <span>{label}</span>
                                    <span className="flex items-center gap-1">
                                        {range.prefix && <span aria-hidden="true">{range.prefix}</span>}
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            step={range.step}
                                            placeholder="Any"
                                            value={drafts[key]}
                                            onChange={event => setDrafts(current => ({ ...current, [key]: event.target.value }))}
                                            className={inputClassName}
                                        />
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                ))}
                <fieldset className="mb-4">
                    <legend className="mb-2 text-sm font-semibold text-fg">Tags <span className="font-normal text-fg-subtle">(cards with all of them)</span></legend>
                    <TagInput
                        id="filter-tags"
                        label="Filter by tag"
                        value={draftTags}
                        suggestions={myTags}
                        onAdd={name => setDraftTags(current => [...current, name])}
                        onRemove={name => setDraftTags(current => current.filter(tag => tag !== name))}
                        placeholder="Any"
                    />
                </fieldset>
                <p className="text-xs text-fg-subtle">
                    Fill in any boxes. Cards without that data (e.g. no Scryfall price) are hidden while it's filtered.
                </p>

                {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

                <div className="mt-3 flex justify-end gap-2">
                    {isActive && (
                        <button
                            type="button"
                            onClick={clear}
                            className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-muted"
                        >
                            Clear
                        </button>
                    )}
                    <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent hover:bg-accent-hover">
                        Apply
                    </button>
                </div>
            </form>
        </details>
    )
}
