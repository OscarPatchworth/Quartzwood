import { useEffect, useState } from "react"
import { postApiTradeQuote, type TradeQuoteItemDto } from "../../interfaces/generated.ts"
import { getErrorMessage } from "../../api/getErrorMessage"
import type { IncomingCard } from "./tradeTypes"

interface Quote {
    // Which incoming list this answer is for
    forKey: string
    items: TradeQuoteItemDto[]
    total: number
}

// Keeps the incoming cards priced: whenever they change, asks the server again (shortly after the last change,
// so editing a quantity from 1 to 4 is one request). Items line up with `incoming` by position
export function useTradeQuote(incoming: IncomingCard[]) {
    const [quote, setQuote] = useState<Quote>()
    const [errorMessage, setErrorMessage] = useState<string>()

    // What the server needs to know; a change in anything else (e.g. a key) doesn't need a new price
    const cards = incoming.map(item => item.card)
    const requestKey = JSON.stringify(cards)

    useEffect(() => {
        const body = JSON.parse(requestKey)
        if (body.length === 0) {
            setQuote({ forKey: requestKey, items: [], total: 0 })
            return
        }

        let isCurrent = true
        const timer = setTimeout(async () => {
            try {
                const res = await postApiTradeQuote({ body: { incoming: body } })
                if (!isCurrent) return
                setQuote({ forKey: requestKey, items: res.data.items, total: Number(res.data.total) })
                setErrorMessage(undefined)
            } catch (error) {
                if (isCurrent) setErrorMessage(getErrorMessage(error, "Couldn't price the cards."))
            }
        }, 250)

        // A newer change replaces this one: cancel the timer and ignore its answer if it already left
        return () => {
            isCurrent = false
            clearTimeout(timer)
        }
    }, [requestKey])

    const isFresh = quote?.forKey === requestKey
    return {
        // Only shown when they match the current list (positions would be wrong after a removal otherwise)
        items: isFresh ? quote.items : [],
        // The last total stays visible while re-pricing, so it doesn't flash to $0
        total: quote?.total ?? 0,
        isPricing: !isFresh,
        errorMessage,
    }
}
