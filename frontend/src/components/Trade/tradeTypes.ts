import type { CardSearchResultDto, LocationStepDto, TradeCardDto } from "../../interfaces/generated.ts"

// A card you'd receive, as the add bar described it. key: a stable id for React lists and edits
export interface IncomingCard {
    key: string
    card: TradeCardDto
}

// One copy of one of your cards you'd give away. A snapshot of what was shown when it was picked
// (name, price, where it is), so Side 2 and the pick list don't need to look anything up again
export interface OutgoingCard {
    cardId: string
    name: string | null
    setCode: string | null
    setNumber: string | null
    scryfallId: string | null
    condition: string
    foilType: string
    price: number | null
    boxId: string
    boxName: string
    groupPath: LocationStepDto[]
    // null = not behind a divider (missing in trades saved before dividers existed)
    dividerName?: string | null
}

// The whole trade in progress, kept in this browser's localStorage until it's finished or cleared
export interface TradeDraft {
    incoming: IncomingCard[]
    outgoing: OutgoingCard[]
    // building: choosing cards; collecting: the pick list (finding the cards in their boxes)
    stage: "building" | "collecting"
    // Outgoing card ids ticked off on the pick list
    collected: string[]
}

export const emptyDraft: TradeDraft = { incoming: [], outgoing: [], stage: "building", collected: [] }

// The API sends decimals as numbers (or numeric strings); null = no price
export function toPrice(price: number | string | null | undefined): number | null {
    return price === null || price === undefined ? null : Number(price)
}

export function outgoingFrom(row: CardSearchResultDto, cardId: string): OutgoingCard {
    return {
        cardId,
        name: row.name,
        setCode: row.setCode,
        setNumber: row.setNumber,
        scryfallId: row.scryfallId,
        condition: row.condition,
        foilType: row.foilType,
        price: toPrice(row.price),
        boxId: row.boxId,
        boxName: row.boxName,
        groupPath: row.groupPath,
        dividerName: row.dividerName,
    }
}

// Money compared in whole cents, so 0.1 + 0.2 style floating point leftovers never decide anything
export const cents = (amount: number) => Math.round(amount * 100)
