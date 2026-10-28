import type { CardDto } from '../../interfaces/generated.ts'
import { LoadingIndicator } from '../misc/LoadingIndicator.tsx'
import { formatPrice } from '../../utils/formatPrice'

interface CardDetailsProps {
    card?: CardDto
}

export function CardDetails({card: card}: CardDetailsProps) {
    if(card == null){
        return(
            <LoadingIndicator />
        )
    }else{   
        return (
            <div className="p-1">
                <div className="rounded-lg border border-cardinfo-line bg-cardinfo p-4 shadow-[0_2px_8px_rgba(120,53,15,0.12)]">
                    <div className="mb-3 border-b border-cardinfo-line pb-3">
                        <p className="font-display text-xl font-semibold text-cardinfo-fg">{card.name}</p>
                        <p className="text-sm text-cardinfo-fg-muted">{card.setNumber}-{card.setCode}</p>
                        {/* TCGplayer market price for this printing and finish (foil cards get the foil price) */}
                        <p className="mt-1 text-sm text-cardinfo-fg-muted" title="TCGplayer market price via Scryfall, updated daily">
                            {card.price != null
                                ? <><span className="font-semibold">{formatPrice(card.price)}</span>{card.foilType !== "None" && " (foil)"}</>
                                : <span className="text-fg-subtle">No price</span>}
                        </p>
                    </div>

                    <dl className="space-y-2 text-sm text-cardinfo-fg-muted 
                    mb-3 border-b border-cardinfo-line pb-3">
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Condition</dt>
                            <dd className="text-right">{card.condition}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Foil</dt>
                            <dd className="text-right">{card.foilType}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Stamp</dt>
                            <dd className="text-right">{card.stampType}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Language</dt>
                            <dd className="text-right">{card.language ?? "N/A"}</dd>
                        </div>
                    </dl>

                      <dl className="space-y-2 text-sm text-cardinfo-fg-muted 
                    mb-3 border-b border-cardinfo-line pb-3">
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Proxy</dt>
                            <dd className="text-right">{String(card.isProxy)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Signed</dt>
                            <dd className="text-right">{String(card.isSigned)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">List</dt>
                            <dd className="text-right">{String(card.isList)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Alter</dt>
                            <dd className="text-right">{String(Boolean(card.alterArtist))}</dd>
                        </div>
                        {card.alterArtist &&
                            <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1 ml-5">
                                <dt className="font-semibold text-cardinfo-fg-muted">Alter Artist</dt>
                                <dd className="text-right">{String(card.alterArtist)}</dd>
                            </div>
                        }
                    </dl>

                     <dl className="space-y-2 text-sm text-cardinfo-fg-muted 
                    mb-3 border-b border-cardinfo-line pb-3">
                        <div className="flex justify-between gap-4 border-b border-cardinfo-line pb-1">
                            <dt className="font-semibold text-cardinfo-fg-muted">Notes</dt>
                            <dd className="text-right">{card.notes && String(card.notes)}</dd>
                        </div>

                    </dl>
                </div>
                
            </div>
        )
    }
}