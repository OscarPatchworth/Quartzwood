export interface IParsedCardInput {
    quantity: number
    setCode?: string
    setNumber?: string
    name?: string
    year?: number
    foil: boolean
    isProxy: boolean
    isList: boolean
    alterArtist?: string
    isNameLookup: boolean
    isPRM: boolean
    errors: string[]
}