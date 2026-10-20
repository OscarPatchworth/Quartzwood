import { useRef, useState, type FormEvent } from "react"
import { describeFilter, hasFilter, type CardFilter } from "../../hooks/useCardFilter"

interface FilterMenuProps {
    value: CardFilter
    onChange: (next: CardFilter) => void
}

const inputClassName = "w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"

// "Filter" button + dropdown with a mana value range. Applied with the Apply button or Enter (not on
// every keystroke: typing "10" shouldn't load the cards for "1" first). Shows the active range on the button
export function FilterMenu({ value, onChange }: FilterMenuProps) {
    const menu = useRef<HTMLDetailsElement>(null)
    // What's typed but not applied yet; text, so a half-typed or empty box is allowed
    const [draftMin, setDraftMin] = useState("")
    const [draftMax, setDraftMax] = useState("")
    const [error, setError] = useState<string>()

    const isActive = hasFilter(value)
    const toNumber = (text: string) => text.trim() === "" ? undefined : Number(text)

    // Opening the menu starts the drafts from the filter that's applied now
    function onToggle() {
        if (!menu.current?.open) return
        setDraftMin(value.mvMin?.toString() ?? "")
        setDraftMax(value.mvMax?.toString() ?? "")
        setError(undefined)
    }

    function apply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const mvMin = toNumber(draftMin)
        const mvMax = toNumber(draftMax)
        if ([mvMin, mvMax].some(n => n !== undefined && (!Number.isFinite(n) || n < 0))) {
            setError("Mana values must be 0 or more.")
            return
        }
        if (mvMin !== undefined && mvMax !== undefined && mvMin > mvMax) {
            setError("'At least' is higher than 'at most'.")
            return
        }
        onChange({ mvMin, mvMax })
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
                        ? "border-sky-700 bg-sky-50 text-sky-900 hover:bg-sky-100"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M3 4h14l-5.5 6.5V16l-3-1.5v-4L3 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                {describeFilter(value) ?? "Filter"}
            </summary>
            <form
                onSubmit={apply}
                className="absolute right-0 z-40 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            >
                <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-slate-800">Mana value</legend>
                    {/* Two rows, so one-sided ranges are obvious: fill in just "At least" for 3+ */}
                    <div className="grid grid-cols-[5rem_auto] items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                        <label htmlFor="filter-mv-min">At least</label>
                        <input
                            id="filter-mv-min"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            placeholder="Any"
                            value={draftMin}
                            onChange={event => setDraftMin(event.target.value)}
                            className={inputClassName}
                        />
                        <label htmlFor="filter-mv-max">At most</label>
                        <input
                            id="filter-mv-max"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            placeholder="Any"
                            value={draftMax}
                            onChange={event => setDraftMax(event.target.value)}
                            className={inputClassName}
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Fill in one or both. Cards without Scryfall data are hidden while filtering.</p>
                </fieldset>

                {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}

                <div className="mt-3 flex justify-end gap-2">
                    {isActive && (
                        <button
                            type="button"
                            onClick={clear}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Clear
                        </button>
                    )}
                    <button type="submit" className="rounded-md bg-sky-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700">
                        Apply
                    </button>
                </div>
            </form>
        </details>
    )
}
