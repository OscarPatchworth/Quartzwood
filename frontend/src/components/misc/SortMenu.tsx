import { useRef } from "react"
import { CardSortOptions, type CardSort, type CardSortValue } from "../../hooks/useCardSort"

interface SortMenuProps {
    value: CardSort
    onChange: (next: CardSort) => void
}

// Sort icon + dropdown of sort options, and a button that flips the direction.
// Picking a new option starts in its most useful direction (e.g. "Date added" newest first);
// picking the current option again flips it
export function SortMenu({ value, onChange }: SortMenuProps) {
    const menu = useRef<HTMLDetailsElement>(null)
    const current = CardSortOptions.find(option => option.value === value.sort) ?? CardSortOptions[0]

    function pick(sort: CardSortValue, descendingFirst: boolean) {
        onChange(sort === value.sort
            ? { sort, desc: !value.desc }
            : { sort, desc: descendingFirst })
        menu.current?.removeAttribute("open")
    }

    return (
        <div className="flex items-stretch">
            {/* <details> gives an open/close dropdown without extra state (same as the Export menu) */}
            <details ref={menu} className="relative">
                <summary
                    title="Sort cards"
                    className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-l-lg border border-button-line bg-button px-3 py-2 text-sm font-semibold text-button-fg shadow-sm hover:bg-button-hover"
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                        <path d="M3 5h14M5 10h10M8 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span><span className="sr-only">Sort by </span>{current.label}</span>
                </summary>
                <ul className="absolute right-0 z-40 mt-1 up:bottom-full up:mt-0 up:mb-1 w-44 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-lg">
                    {CardSortOptions.map(option => (
                        <li key={option.value}>
                            <button
                                type="button"
                                onClick={() => pick(option.value, option.descendingFirst)}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-sunken ${
                                    option.value === value.sort ? "font-semibold text-link" : "text-fg-muted"
                                }`}
                            >
                                {option.label}
                                {option.value === value.sort && <span aria-hidden="true">{value.desc ? "↓" : "↑"}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </details>
            <button
                type="button"
                onClick={() => onChange({ ...value, desc: !value.desc })}
                title={value.desc ? "Descending: click for ascending" : "Ascending: click for descending"}
                aria-label={value.desc ? "Sorted descending, switch to ascending" : "Sorted ascending, switch to descending"}
                className="-ml-px inline-flex min-h-10 items-center rounded-r-lg border border-button-line bg-button px-2.5 text-sm font-semibold text-button-fg shadow-sm hover:bg-button-hover"
            >
                {value.desc ? "↓" : "↑"}
            </button>
        </div>
    )
}
