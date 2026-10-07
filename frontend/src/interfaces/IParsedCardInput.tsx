import type { Condition, FoilType } from "../utils/Enum"

export interface IParsedCardInput {
    quantity: number
    setCode?: string
    setNumber?: string
    name?: string
    year?: number
    foilType: FoilType
    condition: Condition
    isProxy: boolean
    alterArtist?: string
    isNameLookup: boolean
    errors: string[]
}