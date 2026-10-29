import { useState } from "react"
import { putApiBoxesByIdVisibility, putApiGroupsByIdVisibility, type BoxDto, type GroupDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"

const OPTIONS = ["Private", "Unlisted", "Public"] as const

// What each setting means, for the dropdown's tooltip and the badge
export const visibilityHint: Record<string, string> = {
    Private: "Only you (and members of this collection) can see it",
    Unlisted: "Anyone with the link can view it, even logged out. Only you can edit",
    Public: "Anyone with the link can view it (for now the same as Unlisted)",
}

type Props = {
    // The group or box, as the server sent it (with its visibility fields)
    item: GroupDto | BoxDto
    kind: "group" | "box"
    // A root group (the collection itself) has no parent to follow
    isRoot?: boolean
    // Called with the updated group/box after a change
    onChanged: (updated: GroupDto & BoxDto) => void
}

// Who can see this group/box. The owner gets a dropdown: "Same as parent (X)" (follows the parent, now and
// when it changes later), Private, Unlisted, Public; plus Copy link while others can see it.
// Everyone else gets a badge saying it's shared with them view-only
export function VisibilityControl({ item, kind, isRoot = false, onChanged }: Props) {
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()
    const [copied, setCopied] = useState(false)

    const effective = item.effectiveVisibility ?? "Private"
    const inherited = item.inheritedVisibility ?? "Private"
    const isShared = effective !== "Private"

    async function change(value: string) {
        setIsSaving(true)
        setErrorMessage(undefined)
        try {
            const body = { visibility: value || null }
            const res = kind === "group"
                ? await putApiGroupsByIdVisibility({ path: { id: item.id }, body })
                : await putApiBoxesByIdVisibility({ path: { id: item.id }, body })
            onChanged(res.data as GroupDto & BoxDto)
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Couldn't change who can see this."))
        } finally {
            setIsSaving(false)
        }
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setErrorMessage("Couldn't copy: copy the address bar instead.")
        }
    }

    if (!item.canChangeVisibility) {
        // Members who aren't the owner don't need a badge for Private; visitors always see "view only"
        if (item.canEdit && !isShared) return null
        return (
            <span title={visibilityHint[effective]}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line-strong bg-panel/80 px-2.5 py-0.5 text-xs font-semibold text-fg-muted">
                <EyeIcon />
                {effective}{!item.canEdit && " · view only"}
            </span>
        )
    }

    return (
        // On its own panel-coloured pill, so it reads on any banner colour
        <div className="flex w-fit flex-wrap items-center gap-2 rounded-lg border border-line-strong bg-panel/80 px-2 py-1">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted" title={visibilityHint[effective]}>
                {isShared ? <EyeIcon /> : <LockIcon />}
                <span className="sr-only">Who can see this {kind}</span>
                <select
                    value={item.visibility ?? ""}
                    disabled={isSaving}
                    onChange={event => void change(event.target.value)}
                    className="rounded-md border border-input-line bg-input px-2 py-1 text-xs font-semibold text-fg disabled:opacity-60"
                >
                    <option value="">{isRoot ? `Default (${inherited})` : `Same as ${kind === "group" ? "parent" : "its group"} (${inherited})`}</option>
                    {OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
            </label>
            {isShared && (
                <button type="button" onClick={() => void copyLink()}
                    className="rounded-md border border-button-line bg-button px-2 py-1 text-xs font-semibold text-button-fg hover:bg-button-hover">
                    {copied ? "Copied!" : "Copy link"}
                </button>
            )}
            {errorMessage && <span role="alert" className="text-xs text-danger">{errorMessage}</span>}
        </div>
    )
}

function EyeIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-3.5 shrink-0">
            <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    )
}

function LockIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-3.5 shrink-0">
            <rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    )
}
