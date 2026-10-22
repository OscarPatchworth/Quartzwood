import { useState, type FormEvent } from "react"
import { postApiCardsBulkTags, postApiCardsBulkUpdate, type BulkUpdateCardsDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { ConditionOptions, FoilTypeOptions, LanguageOptions } from "../../utils/Enum.tsx"
import { useMyTags } from "../../hooks/useMyTags"
import { TagInput } from "../Tags/TagInput"

interface BulkEditDialogProps {
    cardIds: string[]
    onClose: () => void
    // Called after the cards were changed, so the page can reload them
    onSaved: () => Promise<void>
}

// "" = leave this field as it is on every card
const LEAVE = ""
type YesNo = typeof LEAVE | "yes" | "no"

const selectClassName = "w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-fg focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent-line/20"

// Mass edit: only fields that don't change WHICH printing a card is. Every field starts as
// "Leave as is", and only the ones you change are sent, so e.g. setting Condition keeps each card's own foil
export function BulkEditDialog({ cardIds, onClose, onSaved }: BulkEditDialogProps) {
    const [condition, setCondition] = useState(LEAVE)
    const [foilType, setFoilType] = useState(LEAVE)
    const [language, setLanguage] = useState(LEAVE)
    const [isProxy, setIsProxy] = useState<YesNo>(LEAVE)
    const [isSigned, setIsSigned] = useState<YesNo>(LEAVE)
    const [addTags, setAddTags] = useState<string[]>([])
    const [removeTags, setRemoveTags] = useState<string[]>([])
    const { tags: myTags } = useMyTags()
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    const toBool = (value: YesNo) => value === LEAVE ? null : value === "yes"
    const hasFieldChanges = [condition, foilType, language, isProxy, isSigned].some(value => value !== LEAVE)
    const hasTagChanges = addTags.length > 0 || removeTags.length > 0
    const hasChanges = hasFieldChanges || hasTagChanges
    const countLabel = cardIds.length === 1 ? "1 card" : `${cardIds.length} cards`

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!hasChanges) return

        const body: BulkUpdateCardsDto = {
            cardIds,
            condition: condition || null,
            foilType: foilType || null,
            language: language || null,
            isProxy: toBool(isProxy),
            isSigned: toBool(isSigned),
        }

        setIsSaving(true)
        setErrorMessage(undefined)
        try {
            // Two requests (fields, then tags), each only when something in it changed.
            // Each is all-or-nothing on its own; if the tags part fails, the field changes are already saved
            if (hasFieldChanges) await postApiCardsBulkUpdate({ body })
            if (hasTagChanges) await postApiCardsBulkTags({ body: { cardIds, add: addTags, remove: removeTags } })
            await onSaved()
            onClose()
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Could not update the cards. Please try again."))
            setIsSaving(false)
        }
    }

    // One labelled row of the form
    const row = (label: string, control: React.ReactNode) => (
        <label className="grid grid-cols-[7rem_1fr] items-center gap-3 text-sm">
            <span className="font-semibold text-fg-muted">{label}</span>
            {control}
        </label>
    )
    const yesNoOptions = (
        <>
            <option value={LEAVE}>Leave as is</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
        </>
    )

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
            onMouseDown={() => !isSaving && onClose()}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-edit-title"
                onMouseDown={event => event.stopPropagation()}
                onSubmit={save}
                className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl"
            >
                <h2 id="bulk-edit-title" className="text-lg font-semibold text-fg">Edit {countLabel}</h2>
                <p className="mb-4 mt-1 text-sm text-fg-subtle">
                    Only the fields you change are updated. Set, number and name can't be mass edited.
                    Removing a tag removes it whoever added it.
                </p>

                <div className="flex flex-col gap-3">
                    {row("Condition",
                        <select className={selectClassName} value={condition} onChange={event => setCondition(event.target.value)}>
                            <option value={LEAVE}>Leave as is</option>
                            {ConditionOptions.map(value => <option key={value}>{value}</option>)}
                        </select>
                    )}
                    {row("Foil",
                        <select className={selectClassName} value={foilType} onChange={event => setFoilType(event.target.value)}>
                            <option value={LEAVE}>Leave as is</option>
                            {FoilTypeOptions.map(value => <option key={value}>{value}</option>)}
                        </select>
                    )}
                    {row("Language",
                        <select className={selectClassName} value={language} onChange={event => setLanguage(event.target.value)}>
                            <option value={LEAVE}>Leave as is</option>
                            {LanguageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    )}
                    {row("Proxy",
                        <select className={selectClassName} value={isProxy} onChange={event => setIsProxy(event.target.value as YesNo)}>
                            {yesNoOptions}
                        </select>
                    )}
                    {row("Signed",
                        <select className={selectClassName} value={isSigned} onChange={event => setIsSigned(event.target.value as YesNo)}>
                            {yesNoOptions}
                        </select>
                    )}
                    {/* Not wrapped in a <label> like the rows above: the tag box has its own buttons inside */}
                    <div className="grid grid-cols-[7rem_1fr] items-start gap-3 text-sm">
                        <span className="pt-1.5 font-semibold text-fg-muted">Add tags</span>
                        <TagInput
                            id="bulk-add-tags"
                            label="Tags to add to every selected card"
                            value={addTags}
                            suggestions={myTags}
                            onAdd={name => setAddTags(current => [...current, name])}
                            onRemove={name => setAddTags(current => current.filter(tag => tag !== name))}
                            placeholder="None"
                        />
                        <span className="pt-1.5 font-semibold text-fg-muted">Remove tags</span>
                        <TagInput
                            id="bulk-remove-tags"
                            label="Tags to remove from every selected card"
                            value={removeTags}
                            suggestions={myTags}
                            onAdd={name => setRemoveTags(current => [...current, name])}
                            onRemove={name => setRemoveTags(current => current.filter(tag => tag !== name))}
                            placeholder="None"
                        />
                    </div>
                </div>

                {errorMessage && <p role="alert" className="mt-4 text-sm text-danger">{errorMessage}</p>}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                        className="rounded-md border border-line-strong px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || !hasChanges}
                        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : `Update ${countLabel}`}
                    </button>
                </div>
            </form>
        </div>
    )
}
