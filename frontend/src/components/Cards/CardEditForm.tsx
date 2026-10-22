import type { CardDto } from '../../interfaces/generated.ts'
import { LoadingIndicator } from '../misc/LoadingIndicator.tsx'
import { ConditionOptions, FoilTypeOptions, LanguageOptions, StampTypeOptions } from '../../utils/Enum.tsx'

interface CardEditFormProps {
    card?: CardDto
    onChange: (updatedCard: CardDto) => void
}

const inputClassName = "w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-fg focus:border-warning-solid focus:outline-none focus:ring-2 focus:ring-warning-line"
export function CardEditForm({ card, onChange }: CardEditFormProps) {
    if (!card) {
        return <LoadingIndicator />
    }

    function updateField<K extends keyof CardDto>(field: K, value: CardDto[K]) {
        onChange({ ...card, [field]: value } as CardDto)
    }

    return (
    <div className="p-1">
        <div className="rounded-lg border border-warning-line bg-warning-soft/70 p-4 shadow-[0_2px_8px_rgba(120,53,15,0.12)]">
            <div className="mb-3 border-b border-warning-line pb-3">
                <input
                    aria-label="Card name"
                    className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-lg font-bold uppercase text-fg focus:border-warning-line focus:bg-surface focus:outline-none focus:ring-2 focus:ring-warning-line"
                    value={card.name ?? ""}
                    onChange={event => updateField("name", event.target.value)}
                />
                <div className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
                    <input
                        aria-label="Set number"
                        className="w-10 rounded-md border border-transparent bg-transparent px-1 py-1 focus:border-warning-line focus:bg-surface focus:outline-none focus:ring-2 focus:ring-warning-line"
                        value={card.setNumber ?? ""}
                        onChange={event => updateField("setNumber", event.target.value)}
                    />
                    <span>-</span>
                    <input
                        aria-label="Set code"
                        className="w-10 rounded-md border border-transparent bg-transparent px-1 py-1 uppercase focus:border-warning-line focus:bg-surface focus:outline-none focus:ring-2 focus:ring-warning-line"
                        value={card.setCode ?? ""}
                        onChange={event => updateField("setCode", event.target.value)}
                    />
                </div>
            </div>
            <table className="w-full border-collapse text-left text-sm text-fg-muted">
                <tbody className="divide-y divide-warning-line
                mb-3 border-b border-warning-line pb-3">
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Condition</th>
                        <td className="px-3 py-2">
                            <select aria-label="Condition" className={inputClassName} value={card.condition} onChange={event => updateField("condition", event.target.value)}>
                                {ConditionOptions.map(value => <option key={value}>{value}</option>)}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Foil</th>
                        <td className="px-3 py-2">
                            <select aria-label="Foil type" className={inputClassName} value={card.foilType} onChange={event => updateField("foilType", event.target.value)}>
                                {FoilTypeOptions.map(value => <option key={value}>{value}</option>)}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Stamp</th>
                        <td className="px-3 py-2">
                            <select aria-label="Stamp type" className={inputClassName} value={card.stampType} onChange={event => updateField("stampType", event.target.value)}>
                                {StampTypeOptions.map(value => <option key={value}>{value}</option>)}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Language</th>
                        <td className="px-3 py-2">
                            <select aria-label="Language" className={inputClassName} value={card.language} onChange={event => updateField("language", event.target.value)}>
                                {LanguageOptions.map(language => <option key={language.value} value={language.value}>{language.label}</option>)}
                            </select>
                        </td>
                    </tr>
                </tbody>
                <tbody className="divide-y divide-warning-line
                mb-3 border-b border-warning-line pb-3">
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Proxy</th>
                        <td className="px-3 py-2">
                            <input
                                aria-label="Proxy"
                                type="checkbox"
                                className="h-4 w-4 accent-warning-solid focus:ring-warning-solid"
                                checked={card.isProxy}
                                onChange={event => updateField("isProxy", event.target.checked)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">List</th>
                        <td className="px-3 py-2">
                            <input
                                aria-label="List"
                                type="checkbox"
                                className="h-4 w-4 accent-warning-solid focus:ring-warning-solid"
                                checked={card.isList}
                                onChange={event => updateField("isList", event.target.checked)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Alter</th>
                        <td className="px-3 py-2">
                            <input
                                aria-label="Alter"
                                type="checkbox"
                                className="h-4 w-4 accent-warning-solid focus:ring-warning-solid"
                                checked={Boolean(card.alterArtist)}
                                onChange={event => updateField("alterArtist", event.target.checked ? card.alterArtist || "unknown" : null)}
                            />
                        </td>
                    </tr>
                    {card.alterArtist && (
                        <tr>
                            <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Alter artist</th>
                            <td className="px-3 py-2">
                                <input
                                    aria-label="Alter artist"
                                    className={inputClassName}
                                    value={card.alterArtist}
                                    onChange={event => updateField("alterArtist", event.target.value)}
                                />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-fg-muted">Notes</th>
                        <td className="px-3 py-2">
                            <textarea
                                aria-label="Notes"
                                className={inputClassName}
                                rows={3}
                                value={card.notes ?? ""}
                                onChange={event => updateField("notes", event.target.value)}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    )
}