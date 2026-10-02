import type { CardDto } from '../../interfaces/generated.ts'
import { LoadingIndicator } from '../misc/loadingIndicator.tsx'

interface CardEditFormProps {
    card?: CardDto
    onChange: (updatedCard: CardDto) => void
}

const inputClassName = "w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"

export function CardEditForm({ card, onChange }: CardEditFormProps) {
    if (!card) {
        return <LoadingIndicator />
    }

    function updateField<K extends keyof CardDto>(field: K, value: CardDto[K]) {
        onChange({ ...card, [field]: value } as CardDto)
    }

    return (
    <div className="p-1">
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 shadow-[0_2px_8px_rgba(120,53,15,0.12)]">
            <div className="mb-3 border-b border-amber-200 pb-3">
                <input
                    aria-label="Card name"
                    className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-lg font-bold uppercase text-stone-800 focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                    value={card.name ?? ""}
                    onChange={event => updateField("name", event.target.value)}
                />
                <div className="mt-1 flex items-center gap-2 text-sm text-stone-600">
                    <input
                        aria-label="Set number"
                        className="w-10 rounded-md border border-transparent bg-transparent px-1 py-1 focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                        value={card.setNumber ?? ""}
                        onChange={event => updateField("setNumber", event.target.value)}
                    />
                    <span>-</span>
                    <input
                        aria-label="Set code"
                        className="w-10 rounded-md border border-transparent bg-transparent px-1 py-1 uppercase focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                        value={card.setCode ?? ""}
                        onChange={event => updateField("setCode", event.target.value)}
                    />
                </div>
            </div>
            <table className="w-full border-collapse text-left text-sm text-stone-700">
                <tbody className="divide-y divide-amber-100">
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-stone-600">Condition</th>
                        <td className="px-3 py-2">
                            <select aria-label="Condition" className={inputClassName} value={card.condition} onChange={event => updateField("condition", event.target.value)}>
                                {["NM", "LP", "MP", "HP", "DMG"].map(value => <option key={value}>{value}</option>)}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-stone-600">Foil</th>
                        <td className="px-3 py-2">
                            <select aria-label="Foil type" className={inputClassName} value={card.foilType} onChange={event => updateField("foilType", event.target.value)}>
                                {["None", "Traditional", "Etched", "Other"].map(value => <option key={value}>{value}</option>)}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-stone-600">Stamp</th>
                        <td className="px-3 py-2">
                            <select aria-label="Stamp type" className={inputClassName} value={card.stampType} onChange={event => updateField("stampType", event.target.value)}>
                                {["None", "Promo", "Prerelease"].map(value => <option key={value}>{value}</option>)}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="px-3 py-2 font-semibold text-stone-600">Language</th>
                        <td className="px-3 py-2">
                            <input aria-label="Language" className={inputClassName} value={card.language} onChange={event => updateField("language", event.target.value)} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    )
}