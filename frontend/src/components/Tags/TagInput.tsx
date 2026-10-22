import { useState, type KeyboardEvent } from "react"

interface TagInputProps {
    id: string
    // Screen-reader label for the text box
    label: string
    // Tags already chosen, shown as chips
    value: string[]
    onAdd: (name: string) => void
    onRemove: (name: string) => void
    // Names to suggest while typing (the user's own tags)
    suggestions: string[]
    placeholder?: string
    disabled?: boolean
}

// The server's limit (Tag.MaxNameLength)
const MAX_LENGTH = 40

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// Chips with an × for each tag, plus a text box that suggests matching tags as you type.
// Enter (or clicking a suggestion) adds it; a name that isn't suggested shows as 'Create "..."'.
// Used by the card panel, mass edit and the tag filter: what "add" and "remove" DO is up to the caller
export function TagInput({ id, label, value, onAdd, onRemove, suggestions, placeholder = "Add a tag", disabled }: TagInputProps) {
    const [text, setText] = useState("")
    const [isOpen, setIsOpen] = useState(false)

    const typed = text.trim()
    const matches = suggestions
        .filter(name => !value.some(chosen => sameName(chosen, name)))
        .filter(name => name.toLowerCase().includes(typed.toLowerCase()))
        .slice(0, 8)
    const isNew = typed.length > 0
        && !suggestions.some(name => sameName(name, typed))
        && !value.some(chosen => sameName(chosen, typed))

    function add(name: string) {
        const cleaned = name.trim()
        if (!cleaned || value.some(chosen => sameName(chosen, cleaned))) return
        // An existing tag keeps its own spelling ("trade" typed -> "Trade" added)
        onAdd(suggestions.find(existing => sameName(existing, cleaned)) ?? cleaned)
        setText("")
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            // Enter adds what's typed; it must not submit a surrounding form (e.g. mass edit's)
            event.preventDefault()
            add(typed)
        } else if (event.key === "Escape") {
            setIsOpen(false)
        } else if (event.key === "Backspace" && text === "" && value.length > 0) {
            onRemove(value[value.length - 1])
        }
    }

    return (
        <div className="relative">
            <div className={`flex flex-wrap items-center gap-1 rounded-md border border-line-strong bg-surface px-2 py-1 focus-within:border-accent-line focus-within:ring-2 focus-within:ring-accent-line/20 ${disabled ? "opacity-60" : ""}`}>
                {value.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">
                        {name}
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onRemove(name)}
                            aria-label={`Remove tag ${name}`}
                            className="rounded-full leading-none text-link hover:text-accent-ink"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <label htmlFor={id} className="sr-only">{label}</label>
                <input
                    id={id}
                    type="text"
                    autoComplete="off"
                    maxLength={MAX_LENGTH}
                    disabled={disabled}
                    placeholder={value.length === 0 ? placeholder : ""}
                    value={text}
                    onChange={event => { setText(event.target.value); setIsOpen(true) }}
                    onFocus={() => setIsOpen(true)}
                    // Delay closing, so a click on a suggestion still lands before the list disappears
                    onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                    onKeyDown={onKeyDown}
                    className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                />
            </div>

            {isOpen && !disabled && (matches.length > 0 || isNew) && (
                <ul role="listbox" className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-lg">
                    {matches.map(name => (
                        <li key={name} role="option" aria-selected={false}>
                            <button
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => add(name)}
                                className="w-full px-3 py-1.5 text-left text-sm text-fg-muted hover:bg-surface-sunken"
                            >
                                {name}
                            </button>
                        </li>
                    ))}
                    {isNew && (
                        <li role="option" aria-selected={false}>
                            <button
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => add(typed)}
                                className="w-full px-3 py-1.5 text-left text-sm text-link hover:bg-surface-sunken"
                            >
                                Create "<span className="font-semibold">{typed}</span>"
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}
