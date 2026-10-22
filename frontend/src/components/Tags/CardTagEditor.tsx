import { useState } from "react"
import { postApiCardsBulkTags } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { useMyTags } from "../../hooks/useMyTags"
import { TagInput } from "./TagInput"

interface CardTagEditorProps {
    // The copies being edited (the panel's selected copies)
    cardIds: string[]
    // Their current tags (every copy in a stack has the same ones)
    tags: string[]
    // Called after a change was saved, so the panel and the page can reload
    onChanged: () => Promise<void>
}

// The card panel's Tags section. Saves straight away (no Update button): adding a tag here is quick and
// easy to undo, and it works the same whether or not the panel is in edit mode
export function CardTagEditor({ cardIds, tags, onChanged }: CardTagEditorProps) {
    const { tags: myTags, refresh: refreshMyTags } = useMyTags()
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    async function change(body: { add?: string[], remove?: string[] }) {
        setIsSaving(true)
        setErrorMessage(undefined)
        try {
            await postApiCardsBulkTags({ body: { cardIds, add: body.add ?? null, remove: body.remove ?? null } })
            await onChanged()
            // A brand-new name is now one of your tags: suggest it from now on
            if (body.add) await refreshMyTags()
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Could not change the tags."))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="mt-3 px-1">
            <p className="mb-1 text-sm font-semibold text-fg-muted">
                Tags{cardIds.length > 1 && <span className="font-normal text-fg-subtle"> (for {cardIds.length} copies)</span>}
            </p>
            <TagInput
                id="card-tags"
                label="Add a tag to this card"
                value={tags}
                suggestions={myTags}
                onAdd={name => void change({ add: [name] })}
                onRemove={name => void change({ remove: [name] })}
                disabled={isSaving}
            />
            {errorMessage && <p role="alert" className="mt-1 text-sm text-danger">{errorMessage}</p>}
        </div>
    )
}
