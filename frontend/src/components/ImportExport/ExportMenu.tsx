import { useEffect, useRef, useState } from "react"
import { getApiExportFormats, type TransferFormatDto } from "../../interfaces/generated.ts"

interface ExportMenuProps {
    // A group exports everything inside it (the collection root = the whole collection)
    kind: "group" | "box"
    id: string
}

// "Export" button with a dropdown of formats. Each entry is a plain download link:
// the server sends the file, the browser saves it (the login cookie goes along automatically)
export function ExportMenu({ kind, id }: ExportMenuProps) {
    const [formats, setFormats] = useState<TransferFormatDto[]>([])
    const menu = useRef<HTMLDetailsElement>(null)

    useEffect(() => {
        getApiExportFormats()
            .then(res => setFormats(res.data))
            .catch(() => setFormats([]))
    }, [])

    return (
        // <details> gives an open/close dropdown without extra state
        <details ref={menu} className="relative">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-fg-muted shadow-sm hover:bg-surface-muted">
                Export
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </summary>
            <ul className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
                {formats.length === 0 && <li className="px-3 py-2 text-sm text-fg-subtle">Loading formats...</li>}
                {formats.map(format => (
                    <li key={format.key}>
                        <a
                            href={`/api/export/${kind === "group" ? "groups" : "boxes"}/${encodeURIComponent(id)}?format=${format.key}`}
                            download
                            onClick={() => menu.current?.removeAttribute("open")}
                            className="block px-3 py-2 text-sm text-fg-muted hover:bg-surface-sunken"
                        >
                            {format.displayName}
                        </a>
                    </li>
                ))}
            </ul>
        </details>
    )
}
