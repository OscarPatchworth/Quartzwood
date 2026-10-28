import type { ReactNode } from "react"

interface SearchInputProps {
    id: string
    value: string
    onChange: (value: string) => void
    placeholder: string
    // Screen-reader label (there's no visible label)
    label: string
    // Shows a small spinner in place of the search icon
    isSearching?: boolean
    autoFocus?: boolean
    // Anything to show inside the box after the input, e.g. the add bar's "Add card" button
    children?: ReactNode
}

// The search box used by both the collection search page and the add-card bar, so they look and feel the same
export function SearchInput({ id, value, onChange, placeholder, label, isSearching = false, autoFocus, children }: SearchInputProps) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-input p-2 shadow-sm transition focus-within:border-accent-line focus-within:ring-4 focus-within:ring-accent-line/10">
            <span aria-hidden="true" className="pl-2 text-fg-subtle">
                {isSearching ? (
                    <svg viewBox="0 0 20 20" className="size-4 animate-spin">
                        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="30 14" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 20 20" fill="none" className="size-4">
                        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                )}
            </span>
            <label htmlFor={id} className="sr-only">{label}</label>
            <input
                id={id}
                type="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={autoFocus}
                placeholder={placeholder}
                value={value}
                onChange={event => onChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            {children}
        </div>
    )
}
