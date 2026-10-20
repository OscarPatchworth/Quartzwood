import { useState, type FormEvent } from "react"
import { getErrorMessage } from "../../api/getErrorMessage"
import { postApiDividers, type DividerDto } from "../../interfaces/generated.ts"

interface AddDividerButtonProps {
    boxId: string
    onCreated: (divider: DividerDto) => void
}

// "Add divider" button and its name dialog. New dividers go at the back of the box
export function AddDividerButton({ boxId, onCreated }: AddDividerButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    function open() {
        setName("")
        setErrorMessage(undefined)
        setIsOpen(true)
    }

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        setErrorMessage(undefined)
        try {
            const response = await postApiDividers({ body: { boxId, name: name.trim() } })
            onCreated(response.data)
            setIsOpen(false)
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Unable to add the divider."))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={open}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Divider
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
                    onMouseDown={() => !isSaving && setIsOpen(false)}
                >
                    <form
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-divider-title"
                        onMouseDown={event => event.stopPropagation()}
                        onSubmit={create}
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                    >
                        <h2 id="add-divider-title" className="mb-1 text-lg font-semibold text-slate-900">
                            Add divider
                        </h2>
                        <p className="mb-4 text-sm text-slate-600">It goes at the back of the box.</p>
                        <label htmlFor="add-divider-name" className="mb-1 block text-sm font-medium text-slate-700">
                            Name
                        </label>
                        <input
                            id="add-divider-name"
                            autoFocus
                            maxLength={100}
                            value={name}
                            onChange={event => setName(event.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20"
                        />
                        {errorMessage && <p role="alert" className="mt-3 text-sm text-rose-700">{errorMessage}</p>}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => setIsOpen(false)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !name.trim()}
                                className="rounded-md bg-sky-800 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
