import { useState, type FormEvent } from "react"
import { postApiCardsBulkUpdate, type BulkUpdateCardsDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import { ConditionOptions, FoilTypeOptions, LanguageOptions } from "../../utils/Enum.tsx"

interface BulkEditDialogProps {
    cardIds: string[]
    onClose: () => void
    // Called after the cards were changed, so the page can reload them
    onSaved: () => Promise<void>
}

// "" = leave this field as it is on every card
const LEAVE = ""
type YesNo = typeof LEAVE | "yes" | "no"

const selectClassName = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"

// Mass edit: only fields that don't change WHICH printing a card is. Every field starts as
// "Leave as is", and only the ones you change are sent, so e.g. setting Condition keeps each card's own foil
export function BulkEditDialog({ cardIds, onClose, onSaved }: BulkEditDialogProps) {
    const [condition, setCondition] = useState(LEAVE)
    const [foilType, setFoilType] = useState(LEAVE)
    const [language, setLanguage] = useState(LEAVE)
    const [isProxy, setIsProxy] = useState<YesNo>(LEAVE)
    const [isSigned, setIsSigned] = useState<YesNo>(LEAVE)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    const toBool = (value: YesNo) => value === LEAVE ? null : value === "yes"
    const hasChanges = [condition, foilType, language, isProxy, isSigned].some(value => value !== LEAVE)
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
            await postApiCardsBulkUpdate({ body })
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
            <span className="font-semibold text-slate-600">{label}</span>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onMouseDown={() => !isSaving && onClose()}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-edit-title"
                onMouseDown={event => event.stopPropagation()}
                onSubmit={save}
                className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            >
                <h2 id="bulk-edit-title" className="text-lg font-semibold text-slate-900">Edit {countLabel}</h2>
                <p className="mb-4 mt-1 text-sm text-slate-500">
                    Only the fields you change are updated. Set, number and name can't be mass edited.
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
                </div>

                {errorMessage && <p role="alert" className="mt-4 text-sm text-rose-700">{errorMessage}</p>}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || !hasChanges}
                        className="rounded-md bg-sky-800 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : `Update ${countLabel}`}
                    </button>
                </div>
            </form>
        </div>
    )
}
