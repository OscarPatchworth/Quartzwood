
import type { IParsedCardInput } from "../interfaces/IParsedCardInput"

// A set code: exactly 3 letters/digits with at least one letter (IKO, M21, 2XM), so a plain number isn't one
const SET = String.raw`(?=[A-Z0-9]*[A-Z])[A-Z0-9]{3}`

const patterns = {
    quantity:     /^(\d{1,3})$/,
    // Each set pattern: number then set (107-IKO) in groups 1+2, or set then number (IKO-107) in groups 3+4
    dashedSet:    new RegExp(String.raw`^(?:(\d{1,3})-(${SET})|(${SET})-(\d{1,3}))$`, 'i'),
    // \. = a literal dot (a bare . in a regex matches any character)
    dotSet:       new RegExp(String.raw`^(?:(\d{1,3})\.(${SET})|(${SET})\.(\d{1,3}))$`, 'i'),
    // Set codes are always 3 characters, so the split is fixed: IKO107 = IKO #107, M2110 = M21 #10
    compactSet:   new RegExp(String.raw`^(?:(\d{1,3})(${SET})|(${SET})(\d{1,3}))$`, 'i'),
    year:         /^\d{4}$/,
    flagFoil:     /^-f$/i,
    flagProxy:    /^-p$/i,
    flagSigned:   /^-s$/i,
    flagList:     /^-l$/i,
    alterArtist:  /^-a$/i,
}

// Checked in this order; all three share the same group layout
const setPatterns = [patterns.dashedSet, patterns.dotSet, patterns.compactSet]

// Scryfall collector numbers have no padding: IKO-001 is IKO #1 (keeps a lone "0")
function stripLeadingZeros(setNumber: string): string {
    return setNumber.replace(/^0+(?=\d)/, '')
}

export function parseCardInput(input: string): IParsedCardInput {
    const result: IParsedCardInput = {
        quantity: 1,
        foil: false,
        isProxy: false,
        isList: false,
        isNameLookup: false,
        isPRM: false,
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

        // year, before set codes so it can never be read as one
        if (patterns.year.test(token)) {
            result.year = parseInt(token)
            i++; continue
        }

        // set code + number e.g. IKO-107, 107-IKO, IKO.107, 107.IKO, IKO107, 107IKO
        const setMatch = setPatterns.map(pattern => token.match(pattern)).find(match => match)
        if (setMatch) {
            result.setNumber = stripLeadingZeros(setMatch[1] ?? setMatch[4])
            result.setCode = (setMatch[2] ?? setMatch[3])?.toUpperCase()
            i++; continue
        }

        // flags
        if (patterns.flagFoil.test(token))  { result.foil = true; i++; continue }
        if (patterns.flagProxy.test(token)) { result.isProxy = true; i++; continue }
        if (patterns.flagList.test(token)) { result.isList = true; i++; continue }

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

    // Is PRM set card (PRM-1 != scryfall PRM)
    if (result.setCode != null && result.setCode == 'PRM'){
        result.isPRM = true;
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