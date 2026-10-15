import { useState, type FormEvent } from "react"
import { getErrorMessage } from "../../api/getErrorMessage"
import { postApiBoxes, postApiGroups, type BoxDto, type GroupDto } from "../../interfaces/generated.ts"

interface ABGCProps {
    groupId?: string
    onBoxCreated: (box: BoxDto) => void
    onGroupCreated: (group: GroupDto) => void
}

type CreateType = "group" | "box"

export function AddBoxGroupController({ groupId, onBoxCreated, onGroupCreated }: ABGCProps){
    const [createType, setCreateType] = useState<CreateType>()
    const [name, setName] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    function openCreateForm(type: CreateType) {
        setCreateType(type)
        setName("")
        setErrorMessage(undefined)
    }

    async function createItem(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!groupId || !createType || !name.trim()) return

        setIsSaving(true)
        setErrorMessage(undefined)
        try {
            if (createType === "group") {
                const response = await postApiGroups({
                    body: { name: name.trim(), parentGroupId: groupId },
                })
                onGroupCreated(response.data)
            } else {
                const response = await postApiBoxes({
                    body: { name: name.trim(), groupId },
                })
                onBoxCreated(response.data)
            }
            setCreateType(undefined)
        } catch (error) {
            setErrorMessage(getErrorMessage(error, `Unable to create ${createType}.`))
        } finally {
            setIsSaving(false)
        }
    }

    return(
        <div className="flex flex-wrap items-center gap-2 m-4 align-top">
            <button
                type="button"
                onClick={() => openCreateForm("group")}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 active:translate-y-px"
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Add Group
            </button>
            <button
                type="button"
                onClick={() => openCreateForm("box")}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 active:translate-y-px"
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Add Box
            </button>

            {createType && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
                    onMouseDown={() => !isSaving && setCreateType(undefined)}
                >
                    <form
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-item-title"
                        onMouseDown={event => event.stopPropagation()}
                        onSubmit={createItem}
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                    >
                        <h2 id="create-item-title" className="mb-4 text-lg font-semibold text-slate-900">
                            Add {createType}
                        </h2>
                        <label htmlFor="create-item-name" className="mb-1 block text-sm font-medium text-slate-700">
                            Name
                        </label>
                        <input
                            id="create-item-name"
                            autoFocus
                            value={name}
                            onChange={event => setName(event.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20"
                        />
                        {errorMessage && <p role="alert" className="mt-3 text-sm text-rose-700">{errorMessage}</p>}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => setCreateType(undefined)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !name.trim() || !groupId}
                                className="rounded-md bg-sky-800 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}