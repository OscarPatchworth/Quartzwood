import { useState, type ChangeEvent, type FormEvent } from "react"
import { postApiImportBoxesById, type ImportResultDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"

interface ImportDialogProps {
    boxId: string
    // Called after cards were added, so the page can reload its card list
    onImported?: () => Promise<void>
}

const PLACEHOLDER = `Paste a list or choose a file. The format is detected automatically:

4 Sol Ring (C21) 263
1 Lightning Bolt (2X2) 117 *F*

...or a Moxfield / Deckbox / ManaBox CSV export`

// "Import" button + dialog: paste text or pick a file; every line that can be added is,
// and the lines that couldn't be are listed with the reason
export function ImportDialog({ boxId, onImported }: ImportDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [content, setContent] = useState("")
    const [fileName, setFileName] = useState<string>()
    const [isImporting, setIsImporting] = useState(false)
    const [result, setResult] = useState<ImportResultDto>()
    const [errorMessage, setErrorMessage] = useState<string>()

    function open() {
        setContent("")
        setFileName(undefined)
        setResult(undefined)
        setErrorMessage(undefined)
        setIsOpen(true)
    }

    async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        // Read in the browser and send as text: the server never sees the file itself
        setContent(await file.text())
        setFileName(file.name)
        setResult(undefined)
    }

    async function runImport(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!content.trim()) return

        setIsImporting(true)
        setErrorMessage(undefined)
        try {
            const res = await postApiImportBoxesById({ path: { id: boxId }, body: { content } })
            setResult(res.data)
            if (Number(res.data.cardsAdded) > 0) await onImported?.()
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Import failed."))
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={open}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-fg-muted shadow-sm hover:bg-surface-muted"
            >
                Import
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
                    onMouseDown={() => !isImporting && setIsOpen(false)}
                >
                    <form
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="import-title"
                        onMouseDown={event => event.stopPropagation()}
                        onSubmit={runImport}
                        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-surface p-6 shadow-xl"
                    >
                        <h2 id="import-title" className="mb-4 text-lg font-semibold text-fg">Import cards into this box</h2>

                        <div className="mb-2 flex items-center gap-3">
                            <label className="cursor-pointer rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-muted">
                                Choose file...
                                <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={chooseFile} className="sr-only" />
                            </label>
                            {fileName && <span className="truncate text-sm text-fg-muted">{fileName}</span>}
                        </div>

                        <textarea
                            value={content}
                            onChange={event => { setContent(event.target.value); setFileName(undefined); setResult(undefined) }}
                            placeholder={PLACEHOLDER}
                            aria-label="Cards to import"
                            rows={10}
                            className="w-full resize-y rounded-md border border-line-strong px-3 py-2 font-mono text-xs outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line/20"
                        />

                        {errorMessage && <p role="alert" className="mt-3 text-sm text-danger">{errorMessage}</p>}

                        {result && (
                            <div className="mt-3 min-h-0 overflow-y-auto text-sm" aria-live="polite">
                                <p className="text-fg">
                                    Added <strong>{result.cardsAdded}</strong> {Number(result.cardsAdded) === 1 ? "card" : "cards"} ({result.linesAdded} {Number(result.linesAdded) === 1 ? "line" : "lines"}) from a {result.format}.
                                </p>
                                {result.failed.length > 0 && (
                                    <>
                                        <p className="mt-2 font-medium text-danger">
                                            {result.failed.length} {result.failed.length === 1 ? "line" : "lines"} couldn't be imported:
                                        </p>
                                        <ul className="mt-1 divide-y divide-danger-line rounded-md border border-danger-line bg-danger-soft">
                                            {result.failed.map(failure => (
                                                <li key={failure.line} className="px-3 py-2">
                                                    <p className="font-mono text-xs text-fg-muted">
                                                        <span className="text-fg-subtle">Line {failure.line}: </span>{failure.text}
                                                    </p>
                                                    <p className="text-xs text-danger">{failure.reason}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={isImporting}
                                onClick={() => setIsOpen(false)}
                                className="rounded-md border border-line-strong px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted disabled:opacity-50"
                            >
                                {result ? "Close" : "Cancel"}
                            </button>
                            <button
                                type="submit"
                                disabled={isImporting || !content.trim() || result !== undefined}
                                className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isImporting ? "Importing..." : "Import"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
