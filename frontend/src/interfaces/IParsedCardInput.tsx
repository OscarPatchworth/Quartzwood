export interface IParsedCardInput {
    quantity: number
    setCode?: string
    setNumber?: string
    name?: string
    year?: number
    foil: boolean
    isProxy: boolean
    alterArtist?: string
    isNameLookup: boolean
    errors: string[]
}