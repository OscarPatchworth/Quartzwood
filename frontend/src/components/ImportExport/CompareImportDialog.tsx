import { useEffect, useState, type ChangeEvent, type FormEvent, type WheelEvent } from "react"
import {
    postApiImportBoxesById,
    postApiImportBoxesByIdCompare,
    type DividerDto,
    type GroupedCardDto,
    type ImportCompareDto,
    type ImportIncomingStackDto,
} from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { cardImageUrl } from "../../utils/cardImageUrl"
import { CardSortOptions, type CardSort } from "../../hooks/useCardSort"

interface CompareImportDialogProps {
    boxId: string
    boxName: string
    // The box's dividers, front first: you can compare with one divider's cards instead of the whole box
    dividers: DividerDto[]
    // Called after cards were added, so the page can reload its card list
    onImported?: () => Promise<void>
}

const PLACEHOLDER = `Paste a list or choose a file (e.g. a ManaBox CSV export).
Nothing is added until you've compared it with the box and pressed Add.`

// Sorted like the box is physically: print order unless you pick another sort
const DEFAULT_SORT: CardSort = { sort: "printed", desc: false }

// "Compare" button: pick a list (like Import), then see it next to what's already in the box (or behind one
// divider). One column per printing: what's there on top, what's coming on the bottom. Where both rows have
// cards, the new ones join cards you already have (same sleeve); the column order shows where everything goes.
// Then add them all (behind the divider, or loose for the whole box), or cancel
export function CompareImportDialog({ boxId, boxName, dividers, onImported }: CompareImportDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [content, setContent] = useState("")
    const [fileName, setFileName] = useState<string>()
    // "" = the whole box
    const [dividerId, setDividerId] = useState("")
    const [sort, setSort] = useState<CardSort>(DEFAULT_SORT)
    // Set once compared: the second step (the two rows) is showing
    const [comparison, setComparison] = useState<ImportCompareDto>()
    const [isBusy, setIsBusy] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    const divider = dividers.find(d => d.id === dividerId)
    const targetName = divider ? `behind "${divider.name}"` : `loose in ${boxName}`

    function open() {
        setContent("")
        setFileName(undefined)
        setDividerId("")
        setSort(DEFAULT_SORT)
        setComparison(undefined)
        setErrorMessage(undefined)
        setIsOpen(true)
    }

    function close() {
        if (!isBusy) setIsOpen(false)
    }

    async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        // Read in the browser and send as text: the server never sees the file itself
        setContent(await file.text())
        setFileName(file.name)
    }

    async function compare(nextSort: CardSort) {
        setIsBusy(true)
        setErrorMessage(undefined)
        try {
            const res = await postApiImportBoxesByIdCompare({
                path: { id: boxId },
                body: { content, dividerId: dividerId || null, sort: nextSort.sort, descending: nextSort.desc },
            })
            setComparison(res.data)
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Couldn't compare the list."))
        } finally {
            setIsBusy(false)
        }
    }

    function submitList(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (content.trim()) void compare(sort)
    }

    function changeSort(next: CardSort) {
        setSort(next)
        void compare(next)
    }

    async function addAll() {
        setIsBusy(true)
        setErrorMessage(undefined)
        try {
            await postApiImportBoxesById({ path: { id: boxId }, body: { content, dividerId: dividerId || null } })
            await onImported?.()
            setIsOpen(false)
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Couldn't add the cards."))
        } finally {
            setIsBusy(false)
        }
    }

    // Escape closes (step 2 is full screen, so there's no backdrop to click)
    useEffect(() => {
        if (!isOpen) return
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !isBusy) setIsOpen(false) }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [isOpen, isBusy])

    return (
        <>
            <button
                type="button"
                onClick={open}
                title="Compare a list with this box before adding it"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-button-line bg-button px-4 py-2 text-sm font-semibold text-button-fg shadow-sm hover:bg-button-hover"
            >
                Compare
            </button>

            {isOpen && !comparison && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onMouseDown={close}>
                    <form
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="compare-title"
                        onMouseDown={event => event.stopPropagation()}
                        onSubmit={submitList}
                        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-panel p-6 shadow-xl"
                    >
                        <h2 id="compare-title" className="mb-4 text-heading text-fg-heading">Compare a list with this box</h2>

                        <div className="mb-2 flex items-center gap-3">
                            <label className="cursor-pointer rounded-md border border-button-line bg-button px-3 py-1.5 text-sm font-medium text-button-fg hover:bg-button-hover">
                                Choose file...
                                <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={chooseFile} className="sr-only" />
                            </label>
                            {fileName && <span className="truncate text-sm text-fg-muted">{fileName}</span>}
                        </div>

                        <textarea
                            value={content}
                            onChange={event => { setContent(event.target.value); setFileName(undefined) }}
                            placeholder={PLACEHOLDER}
                            aria-label="Cards to compare"
                            rows={10}
                            className="w-full resize-y rounded-md border border-input-line bg-input px-3 py-2 font-mono text-xs outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line/20"
                        />

                        <label className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-fg-muted">Compare with</span>
                            <select
                                value={dividerId}
                                onChange={event => setDividerId(event.target.value)}
                                className="min-w-0 flex-1 rounded-md border border-input-line bg-input px-2 py-1.5 text-sm outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line/20"
                            >
                                <option value="">The whole box (cards are added loose)</option>
                                {dividers.map(d => <option key={d.id} value={d.id}>Divider: {d.name} (cards are added behind it)</option>)}
                            </select>
                        </label>

                        {errorMessage && <p role="alert" className="mt-3 text-sm text-danger">{errorMessage}</p>}

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={close}
                                className="rounded-md border border-button-line bg-button px-3 py-2 text-sm font-medium text-button-fg hover:bg-button-hover disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isBusy || !content.trim()}
                                className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isBusy ? "Comparing..." : "Compare"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isOpen && comparison && (
                <ComparisonView
                    comparison={comparison}
                    title={divider ? `Divider "${divider.name}"` : boxName}
                    targetName={targetName}
                    sort={sort}
                    onSortChange={changeSort}
                    isBusy={isBusy}
                    errorMessage={errorMessage}
                    onBack={() => { setComparison(undefined); setErrorMessage(undefined) }}
                    onCancel={close}
                    onAdd={() => void addAll()}
                />
            )}
        </>
    )
}

interface ComparisonViewProps {
    comparison: ImportCompareDto
    title: string
    // Where Add puts the cards, e.g. 'behind "Rares"'
    targetName: string
    sort: CardSort
    onSortChange: (sort: CardSort) => void
    isBusy: boolean
    errorMessage?: string
    onBack: () => void
    onCancel: () => void
    onAdd: () => void
}

// Full screen: two rows of cards that scroll sideways together, one column per printing
function ComparisonView({ comparison, title, targetName, sort, onSortChange, isBusy, errorMessage, onBack, onCancel, onAdd }: ComparisonViewProps) {
    const { columns, incomingCount, failed } = comparison
    const joining = columns.filter(c => c.existing.length > 0 && c.incoming.length > 0).length
    const newPrintings = columns.filter(c => c.existing.length === 0).length

    // A mouse wheel scrolls the rows sideways (there's nothing to scroll up and down)
    function scrollSideways(event: WheelEvent<HTMLDivElement>) {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY
    }

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="comparison-title" className="fixed inset-0 z-50 flex flex-col bg-page">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-banner-box px-4 py-3 sm:px-8">
                <div className="min-w-0 flex-1">
                    <h2 id="comparison-title" className="truncate text-heading text-fg-heading">Compare with {title}</h2>
                    <p className="text-sm text-fg-muted">
                        {incomingCount} {incomingCount === 1 ? "card" : "cards"} to add ·{" "}
                        <span className="font-semibold text-success">{joining} join{joining === 1 ? "s" : ""} cards you have</span> ·{" "}
                        {newPrintings} new {newPrintings === 1 ? "printing" : "printings"}
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-fg-muted">Sort</span>
                    <select
                        value={sort.sort}
                        disabled={isBusy}
                        onChange={event => {
                            const option = CardSortOptions.find(o => o.value === event.target.value)!
                            onSortChange({ sort: option.value, desc: option.descendingFirst })
                        }}
                        className="rounded-md border border-input-line bg-input px-2 py-1.5 text-sm outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line/20"
                    >
                        {CardSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onSortChange({ ...sort, desc: !sort.desc })}
                        aria-label={sort.desc ? "Descending: switch to ascending" : "Ascending: switch to descending"}
                        title={sort.desc ? "Descending" : "Ascending"}
                        className="rounded-md border border-button-line bg-button px-2 py-1.5 text-sm font-semibold text-button-fg hover:bg-button-hover disabled:opacity-50"
                    >
                        {sort.desc ? "↓" : "↑"}
                    </button>
                </label>
            </div>

            <div
                onWheel={scrollSideways}
                className={`min-h-0 flex-1 overflow-auto p-4 sm:px-8 ${isBusy ? "pointer-events-none opacity-60" : ""}`}
            >
                {columns.length === 0 ? (
                    <p className="text-sm text-fg-muted">There are no cards to compare: the list has no cards that can be added, and there are none here yet.</p>
                ) : (
                    // Two grid rows (there / coming) filled column by column, so every row of a column lines up
                    // and each row is as tall as its tallest cell. The first (narrow) column is the row labels
                    <div className="grid w-max grid-flow-col grid-cols-[1.5rem] grid-rows-[auto_auto] gap-x-2 auto-cols-[7.5rem]">
                        <RowLabel text="In the box" />
                        <RowLabel text="To add" />
                        {columns.map((column, index) => {
                            const joins = column.existing.length > 0 && column.incoming.length > 0
                            const onlyExisting = column.incoming.length === 0
                            const tone = joins ? "bg-success-soft ring-1 ring-success-line" : ""
                            return [
                                <div key={`${index}-top`} className={`flex flex-col justify-end gap-2 rounded-t-lg p-1.5 pb-3 ${tone} ${onlyExisting ? "opacity-60" : ""}`}>
                                    {column.existing.length === 0 ? <EmptySlot /> : column.existing.map(stack => <StackCard key={stack.ids[0]} stack={stack} />)}
                                </div>,
                                <div key={`${index}-bottom`} className={`flex flex-col justify-start gap-2 rounded-b-lg border-t-2 border-dashed border-line-strong p-1.5 pt-3 ${tone}`}>
                                    {column.incoming.length === 0 ? <EmptySlot /> : column.incoming.map(stack => <StackCard key={`${stack.condition}-${stack.foilType}-${stack.language}`} stack={stack} isNew />)}
                                </div>,
                            ]
                        })}
                    </div>
                )}

                {failed.length > 0 && (
                    <details className="mt-6 max-w-2xl text-sm">
                        <summary className="cursor-pointer font-medium text-danger">
                            {failed.length} {failed.length === 1 ? "line" : "lines"} in the list can't be added
                        </summary>
                        <ul className="mt-1 divide-y divide-danger-line rounded-md border border-danger-line bg-danger-soft">
                            {failed.map(failure => (
                                <li key={failure.line} className="px-3 py-2">
                                    <p className="font-mono text-xs text-fg-muted"><span className="text-fg-subtle">Line {failure.line}: </span>{failure.text}</p>
                                    <p className="text-xs text-danger">{failure.reason}</p>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 bg-footer px-4 py-3 sm:px-8">
                {errorMessage && <p role="alert" className="mr-auto text-sm text-danger">{errorMessage}</p>}
                <button type="button" disabled={isBusy} onClick={onBack}
                    className="rounded-md border border-button-line bg-button px-3 py-2 text-sm font-medium text-button-fg hover:bg-button-hover disabled:opacity-50">
                    ← Change list
                </button>
                <button type="button" disabled={isBusy} onClick={onCancel}
                    className="rounded-md border border-button-line bg-button px-3 py-2 text-sm font-medium text-button-fg hover:bg-button-hover disabled:opacity-50">
                    Cancel
                </button>
                <button type="button" disabled={isBusy || incomingCount === 0} onClick={onAdd}
                    className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
                    {isBusy ? "Working..." : `Add ${incomingCount} ${incomingCount === 1 ? "card" : "cards"} ${targetName}`}
                </button>
            </div>
        </div>
    )
}

// Stays put while the rows scroll sideways
function RowLabel({ text }: { text: string }) {
    return (
        <div className="sticky left-0 z-10 flex items-center bg-page pr-2">
            <span className="eyebrow text-xs text-fg-subtle [writing-mode:vertical-rl] rotate-180">{text}</span>
        </div>
    )
}

function EmptySlot() {
    return <div aria-hidden="true" className="aspect-[5/7] w-full rounded-md border border-dashed border-line" />
}

// A stack already in the box (GroupedCardDto), or one from the list (ImportIncomingStackDto)
function StackCard({ stack, isNew = false }: { stack: GroupedCardDto | ImportIncomingStackDto, isNew?: boolean }) {
    const count = Number(stack.count)
    const details = [stack.condition, stack.foilType !== "None" && stack.foilType, stack.language !== "en" && stack.language.toUpperCase()]
        .filter(Boolean).join(" · ")
    return (
        <figure className="relative" title={`${stack.name} (${stack.setCode} #${stack.setNumber}) ${details}`}>
            {stack.scryfallId
                ? <img src={cardImageUrl(stack.scryfallId, "small", stack.language)} alt={stack.name ?? ""} loading="lazy"
                    className={`w-full rounded-md shadow ${isNew ? "ring-2 ring-accent-line" : ""}`} />
                : <div className="aspect-[5/7] w-full rounded-md bg-surface-muted p-2 text-xs">{stack.name}</div>}
            {count > 1 && (
                <span className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-panel/80 text-xs font-bold text-fg">{count}</span>
            )}
            <figcaption className="mt-0.5 truncate text-center text-[0.7rem] text-fg-muted">
                {stack.setCode} #{stack.setNumber} · {details}
            </figcaption>
        </figure>
    )
}
