import type { ReactNode } from 'react'
import type { CardDto } from '../../interfaces/generated.ts'

interface CardDetailsProps {
    card: CardDto
}

export function CardDetails({card: card}: CardDetailsProps) {
    return (
         <div className="p-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 shadow-[0_2px_8px_rgba(120,53,15,0.12)]">
                <div className="mb-3 border-b border-amber-200 pb-3">
                    <p className="text-lg font-bold uppercase tracking-wide text-stone-800">{card.name}</p>
                    <p className="text-sm text-stone-600">{card.setNumber}-{card.setCode}</p>
                </div>

                <dl className="space-y-2 text-sm text-stone-700">
                    <div className="flex justify-between gap-4 border-b border-amber-100 pb-1">
                        <dt className="font-semibold text-stone-600">Condition</dt>
                        <dd className="text-right">{card.condition}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-amber-100 pb-1">
                        <dt className="font-semibold text-stone-600">Foil</dt>
                        <dd className="text-right">{card.foilType}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-amber-100 pb-1">
                        <dt className="font-semibold text-stone-600">Stamp</dt>
                        <dd className="text-right">{card.stampType}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-amber-100 pb-1">
                        <dt className="font-semibold text-stone-600">Language</dt>
                        <dd className="text-right">{card.language ?? "N/A"}</dd>
                    </div>
                </dl>
            </div>
            
        </div>
    )
}