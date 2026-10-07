
import type { IParsedCardInput } from "../interfaces/IParsedCardInput"

const patterns = {
    quantity:     /^(\d{1,3})$/,
    dashedSet:    /^(?:(\d{1,3})-([A-Z]{2,4})|([A-Z]{2,4})-(\d{1,3}))$/i,
    compactSet:   /^(?:(\d{1,3})([A-Z]{2,4})|([A-Z]{2,4})(\d{1,3}))$/i,
    year:         /^\d{4}$/,
    flagFoil:     /^-f$/i,
    flagProxy:    /^-p$/i,
    flagSigned:   /^-s$/i,
    alterArtist:  /^-a$/i,
}

export function parseCardInput(input: string): IParsedCardInput {
    const result: IParsedCardInput = {
        quantity: 1,
        foil: false,
        isProxy: false,
        isNameLookup: false,
        errors: []
    }

    const tokens = input.trim().split(/\s+/)
    const nameTokens: string[] = []
    let i = 0

    while (i < tokens.length) {
        const token = tokens[i]

        // quantity — must be first token
        if (i === 0 && patterns.quantity.test(token)) {
            result.quantity = parseInt(token)
            i++; continue
        }

        // dashed set code e.g. IKO-107 or 107-IKO
        const dashedMatch = token.match(patterns.dashedSet)
        if (dashedMatch) {
            result.setNumber = (dashedMatch[1] ?? dashedMatch[4])
            result.setCode = (dashedMatch[2] ?? dashedMatch[3])?.toUpperCase()
            i++; continue
        }

        // compact set code e.g. 107IKO or IKO107
        const compactMatch = token.match(patterns.compactSet)
        if (compactMatch) {
            result.setNumber = (compactMatch[1] ?? compactMatch[4])
            result.setCode = (compactMatch[2] ?? compactMatch[3])?.toUpperCase()
            i++; continue
        }

        // year
        if (patterns.year.test(token)) {
            result.year = parseInt(token)
            i++; continue
        }

        // flags
        if (patterns.flagFoil.test(token))  { result.foil = true; i++; continue }
        if (patterns.flagProxy.test(token)) { result.isProxy = true; i++; continue }

        // alter artist — next token(s) are the name (handles quoted strings)
        if (patterns.alterArtist.test(token)) {
            // collect remaining quoted or next token
            const rest = tokens.slice(i + 1).join(' ')
            const quoted = rest.match(/^['"](.+?)['"]/)
            result.alterArtist = quoted ? quoted[1] : tokens[i + 1]
            i += quoted ? tokens.slice(i + 1).findIndex((_, j) => 
                tokens.slice(i + 1, i + 1 + j + 1).join(' ').includes(result.alterArtist!)) + 2 : 2
            continue
        }

        // anything else is part of the card name
        nameTokens.push(token)
        i++
    }

    if (nameTokens.length > 0) {
        result.name = nameTokens.join(' ')
        result.isNameLookup = true
    }

    // validation
    if (!result.setCode && !result.name) {
        result.errors.push('Could not identify a set code or card name')
    }

    return result
}